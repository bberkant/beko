<?php
/**
 * DARS Universal Backend & Migration API Gateway
 * Host: https://amasyaetas.com/dars/
 */

// Error handling & limits
error_reporting(0);
ini_set('display_errors', '0');
ini_set('memory_limit', '512M');
ini_set('max_execution_time', '300');

// CORS and response headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-DARS-KEY');

// Preflight OPTIONS response
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Security Check (DARS API Key)
$expectedKey = 'etas_dars_sec_89234710';
$providedKey = $_SERVER['HTTP_X_DARS_KEY'] ?? $_REQUEST['api_key'] ?? '';

if ($providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Yetkisiz erişim (Invalid DARS API Key)'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Database Connection
$dbHost = 'localhost';
$dbName = 'etaseten_dars';
$dbUser = 'etaseten_dars';
$dbPass = 'etas3652';

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}

// Parse request body
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Helper UUID
function gen_uuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Helper to build robust WHERE clause supporting filters, where, and or_groups
function buildDarsWhere($input, &$params) {
    $whereParts = ["1=1"];
    $paramIdx = 0;

    $sanitizeCol = function($c) {
        return preg_replace('/[^a-zA-Z0-9_]/', '', $c);
    };

    $formatCondition = function($col, $op, $val) use (&$params, &$paramIdx, $sanitizeCol) {
        $c = $sanitizeCol($col);
        if (empty($c)) return null;

        $op = strtolower(trim((string)$op));
        $p = ":p_" . $paramIdx++;

        if ($op === 'is_null' || ($op === 'is' && ($val === null || strtolower((string)$val) === 'null'))) {
            return "`{$c}` IS NULL";
        }
        if ($op === 'not_null' || $op === 'is_not_null' || ($op === 'not' && ($val === null || strtolower((string)$val) === 'null')) || ($op === 'not.is' && ($val === null || strtolower((string)$val) === 'null'))) {
            return "`{$c}` IS NOT NULL";
        }
        if ($op === 'eq' || $op === '=') {
            if ($val === null || strtolower((string)$val) === 'null') return "`{$c}` IS NULL";
            $params[$p] = $val;
            return "`{$c}` = {$p}";
        }
        if ($op === 'neq' || $op === '!=' || $op === '<>') {
            if ($val === null || strtolower((string)$val) === 'null') return "`{$c}` IS NOT NULL";
            $params[$p] = $val;
            return "(`{$c}` != {$p} OR `{$c}` IS NULL)";
        }
        if ($op === 'gt' || $op === '>') {
            $params[$p] = $val;
            return "`{$c}` > {$p}";
        }
        if ($op === 'gte' || $op === '>=') {
            $params[$p] = $val;
            return "`{$c}` >= {$p}";
        }
        if ($op === 'lt' || $op === '<') {
            $params[$p] = $val;
            return "`{$c}` < {$p}";
        }
        if ($op === 'lte' || $op === '<=') {
            $params[$p] = $val;
            return "`{$c}` <= {$p}";
        }
        if ($op === 'like') {
            $params[$p] = $val;
            return "`{$c}` LIKE {$p}";
        }
        if ($op === 'ilike') {
            $params[$p] = $val;
            return "LOWER(`{$c}`) LIKE LOWER({$p})";
        }
        if ($op === 'not_like' || $op === 'not.like') {
            $params[$p] = $val;
            return "(`{$c}` NOT LIKE {$p} OR `{$c}` IS NULL)";
        }
        if ($op === 'not_ilike' || $op === 'not.ilike') {
            $params[$p] = $val;
            return "(LOWER(`{$c}`) NOT LIKE LOWER({$p}) OR `{$c}` IS NULL)";
        }
        if ($op === 'in') {
            $vals = is_array($val) ? $val : array_map('trim', explode(',', trim((string)$val, '()')));
            if (empty($vals)) return "1=0";
            $inPlaceholders = [];
            foreach ($vals as $inVal) {
                $inP = ":p_" . $paramIdx++;
                $inPlaceholders[] = $inP;
                $params[$inP] = $inVal;
            }
            return "`{$c}` IN (" . implode(',', $inPlaceholders) . ")";
        }
        if ($op === 'not_in' || $op === 'not.in') {
            $vals = is_array($val) ? $val : array_map('trim', explode(',', trim((string)$val, '()')));
            if (empty($vals)) return "1=1";
            $inPlaceholders = [];
            foreach ($vals as $inVal) {
                $inP = ":p_" . $paramIdx++;
                $inPlaceholders[] = $inP;
                $params[$inP] = $inVal;
            }
            return "(`{$c}` NOT IN (" . implode(',', $inPlaceholders) . ") OR `{$c}` IS NULL)";
        }

        $params[$p] = $val;
        return "`{$c}` = {$p}";
    };

    // 1. Process explicit filters array
    if (!empty($input['filters']) && is_array($input['filters'])) {
        foreach ($input['filters'] as $f) {
            if (isset($f['col']) && isset($f['op'])) {
                $cond = $formatCondition($f['col'], $f['op'], $f['val'] ?? null);
                if ($cond) $whereParts[] = $cond;
            }
        }
    }

    // 2. Process legacy / key-value where object
    if (!empty($input['where']) && is_array($input['where'])) {
        foreach ($input['where'] as $col => $val) {
            if (strpos($col, '__neq_') === 0) {
                $realCol = substr($col, 6);
                $cond = $formatCondition($realCol, 'neq', $val);
            } elseif (strpos($col, '__gt_') === 0) {
                $realCol = substr($col, 5);
                $cond = $formatCondition($realCol, 'gt', $val);
            } elseif (strpos($col, '__gte_') === 0) {
                $realCol = substr($col, 6);
                $cond = $formatCondition($realCol, 'gte', $val);
            } elseif (strpos($col, '__lt_') === 0) {
                $realCol = substr($col, 5);
                $cond = $formatCondition($realCol, 'lt', $val);
            } elseif (strpos($col, '__lte_') === 0) {
                $realCol = substr($col, 6);
                $cond = $formatCondition($realCol, 'lte', $val);
            } elseif (strpos($col, '__not_null_') === 0) {
                $realCol = substr($col, 11);
                $cond = $formatCondition($realCol, 'not_null', null);
            } elseif (strpos($col, '__is_null_') === 0) {
                $realCol = substr($col, 10);
                $cond = $formatCondition($realCol, 'is_null', null);
            } elseif (is_null($val)) {
                $cond = $formatCondition($col, 'is_null', null);
            } elseif (is_array($val)) {
                $cond = $formatCondition($col, 'in', $val);
            } else {
                $cond = $formatCondition($col, 'eq', $val);
            }
            if ($cond) $whereParts[] = $cond;
        }
    }

    // 3. Process PostgREST-style OR filters
    $orList = [];
    if (!empty($input['or'])) {
        if (is_array($input['or'])) {
            $orList = $input['or'];
        } else {
            $orList = [$input['or']];
        }
    }
    if (!empty($input['or_groups']) && is_array($input['or_groups'])) {
        $orList = array_merge($orList, $input['or_groups']);
    }

    foreach ($orList as $orStr) {
        if (!is_string($orStr) || empty(trim($orStr))) continue;
        $tokens = explode(',', $orStr);
        $orClauses = [];
        foreach ($tokens as $token) {
            $token = trim($token);
            if (empty($token)) continue;
            if (preg_match('/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_\.]+)\.(.*)$/i', $token, $m)) {
                $col = $m[1];
                $op = $m[2];
                $val = $m[3];
                if (strtolower($val) === 'null') $val = null;
                $cond = $formatCondition($col, $op, $val);
                if ($cond) $orClauses[] = $cond;
            } elseif (preg_match('/^([a-zA-Z0-9_]+)\.is\.null$/i', $token, $m)) {
                $cond = $formatCondition($m[1], 'is_null', null);
                if ($cond) $orClauses[] = $cond;
            }
        }
        if (!empty($orClauses)) {
            $whereParts[] = "(" . implode(" OR ", $orClauses) . ")";
        }
    }

    return implode(" AND ", $whereParts);
}

// -------------------------------------------------------------
// 1. SELF UPDATE (Allows AI to deploy backend updates remotely)
// -------------------------------------------------------------
if ($action === 'self_update') {
    $newCode = $input['code'] ?? '';
    if (!empty($newCode)) {
        $backupPath = __FILE__ . '.bak';
        @copy(__FILE__, $backupPath);
        file_put_contents(__FILE__, $newCode);
        echo json_encode(['success' => true, 'message' => 'API başarıyla güncellendi'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(['success' => false, 'error' => 'Boş kod gönderildi'], JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// 2. EXECUTE RAW SQL (For table creation and schema migration)
// -------------------------------------------------------------
if ($action === 'exec_sql') {
    $sql = $input['sql'] ?? '';
    if (empty($sql)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Boş SQL'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    try {
        $pdo->exec($sql);
        echo json_encode(['success' => true, 'message' => 'SQL başarıyla çalıştırıldı'], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// -------------------------------------------------------------
// 3. BULK IMPORT BATCH (For high-speed migration of 59 tables)
// -------------------------------------------------------------
if ($action === 'import_batch') {
    $table = preg_replace('/[^a-zA-Z0-9_]/', '', $input['table'] ?? '');
    $rows = $input['rows'] ?? [];

    if (empty($table) || empty($rows) || !is_array($rows)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Geçersiz tablo veya veri'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    try {
        $colsStmt = $pdo->query("DESCRIBE `{$table}`");
        $existingCols = $colsStmt->fetchAll(PDO::FETCH_COLUMN);
        $existingColsSet = array_flip($existingCols);

        $pdo->beginTransaction();

        foreach ($rows as $row) {
            $filteredRow = [];
            foreach ($row as $k => $v) {
                if (isset($existingColsSet[$k])) {
                    if (is_array($v) || is_object($v)) {
                        $filteredRow[$k] = json_encode($v, JSON_UNESCAPED_UNICODE);
                    } elseif (is_bool($v)) {
                        $filteredRow[$k] = $v ? 1 : 0;
                    } else {
                        $filteredRow[$k] = $v;
                    }
                }
            }

            if (empty($filteredRow)) continue;

            $colList = array_keys($filteredRow);
            $colNames = implode(', ', array_map(fn($c) => "`{$c}`", $colList));
            $placeholders = implode(', ', array_map(fn($c) => ":{$c}", $colList));

            $updateParts = [];
            foreach ($colList as $c) {
                if ($c !== 'id') {
                    $updateParts[] = "`{$c}` = VALUES(`{$c}`)";
                }
            }
            $onDuplicate = !empty($updateParts) ? "ON DUPLICATE KEY UPDATE " . implode(', ', $updateParts) : "";

            $sql = "INSERT INTO `{$table}` ({$colNames}) VALUES ({$placeholders}) {$onDuplicate}";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($filteredRow);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'inserted_count' => count($rows)], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// -------------------------------------------------------------
// 4. TABLE COUNTS & HEALTH
// -------------------------------------------------------------
if ($action === 'table_counts') {
    $tables = $input['tables'] ?? [];
    if (empty($tables)) {
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    $counts = [];
    foreach ($tables as $t) {
        $cleanT = preg_replace('/[^a-zA-Z0-9_]/', '', $t);
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM `{$cleanT}`");
            $counts[$cleanT] = (int)$stmt->fetchColumn();
        } catch (Exception $e) {
            $counts[$cleanT] = -1;
        }
    }
    echo json_encode(['success' => true, 'counts' => $counts], JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// 5. GENERIC REST QUERY (Supabase replacement for frontend)
// -------------------------------------------------------------
if ($action === 'rest_query') {
    $table = preg_replace('/[^a-zA-Z0-9_]/', '', $input['table'] ?? '');
    if (empty($table)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing table'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $select = $input['select'] ?? '*';
    if ($select !== '*' && !preg_match('/^[a-zA-Z0-9_, `]+$/', $select)) {
        $select = '*';
    }

    $params = [];
    $whereClause = buildDarsWhere($input, $params);

    $orderClause = "";
    if (!empty($input['order'])) {
        $orderCol = preg_replace('/[^a-zA-Z0-9_]/', '', $input['order']);
        $orderDir = strtoupper($input['dir'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
        $orderClause = "ORDER BY `{$orderCol}` {$orderDir}";
    }

    $limitClause = "";
    $limit = isset($input['limit']) ? (int)$input['limit'] : 25000;
    $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
    if ($limit > 0) {
        $limitClause = "LIMIT {$limit} OFFSET {$offset}";
    }

    $sql = "SELECT {$select} FROM `{$table}` WHERE {$whereClause} {$orderClause} {$limitClause}";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();

        // Auto-decode JSON strings if detected
        foreach ($data as &$row) {
            foreach ($row as $k => $v) {
                if (is_string($v) && (isset($v[0]) && ($v[0] === '{' || $v[0] === '['))) {
                    $decoded = json_decode($v, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $row[$k] = $decoded;
                    }
                }
            }
        }

        echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'sql' => $sql,
            'params' => $params
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// -------------------------------------------------------------
// 6. GENERIC REST MUTATE (Insert / Update / Delete)
// -------------------------------------------------------------
if ($action === 'rest_insert') {
    $table = preg_replace('/[^a-zA-Z0-9_]/', '', $input['table'] ?? '');
    $row = $input['data'] ?? [];
    if (empty($table) || empty($row)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing data'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (empty($row['id'])) {
        $row['id'] = gen_uuid();
    }
    if (!isset($row['created_at'])) {
        $row['created_at'] = date('c');
    }
    if (!isset($row['updated_at'])) {
        $row['updated_at'] = date('c');
    }

    $cols = array_keys($row);
    $colNames = implode(', ', array_map(fn($c) => "`{$c}`", $cols));
    $placeholders = implode(', ', array_map(fn($c) => ":{$c}", $cols));

    $params = [];
    foreach ($row as $k => $v) {
        if (is_array($v) || is_object($v)) {
            $params[":{$k}"] = json_encode($v, JSON_UNESCAPED_UNICODE);
        } elseif (is_bool($v)) {
            $params[":{$k}"] = $v ? 1 : 0;
        } else {
            $params[":{$k}"] = $v;
        }
    }

    $stmt = $pdo->prepare("INSERT INTO `{$table}` ({$colNames}) VALUES ({$placeholders})");
    $stmt->execute($params);

    $fetch = $pdo->prepare("SELECT * FROM `{$table}` WHERE id = ?");
    $fetch->execute([$row['id']]);
    $created = $fetch->fetch();

    echo json_encode(['success' => true, 'data' => $created], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'rest_update') {
    $table = preg_replace('/[^a-zA-Z0-9_]/', '', $input['table'] ?? '');
    $data = $input['data'] ?? [];

    if (empty($table) || empty($data)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing table/data'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $fields = [];
    $updateParams = [];
    $upIdx = 0;
    foreach ($data as $k => $v) {
        $cleanCol = preg_replace('/[^a-zA-Z0-9_]/', '', $k);
        if ($cleanCol === 'id') continue;
        $uP = ":up_" . $upIdx++;
        $fields[] = "`{$cleanCol}` = {$uP}";
        if (is_array($v) || is_object($v)) {
            $updateParams[$uP] = json_encode($v, JSON_UNESCAPED_UNICODE);
        } elseif (is_bool($v)) {
            $updateParams[$uP] = $v ? 1 : 0;
        } else {
            $updateParams[$uP] = $v;
        }
    }

    $uPUpdated = ":up_" . $upIdx++;
    $fields[] = "`updated_at` = {$uPUpdated}";
    $updateParams[$uPUpdated] = date('c');

    $whereParams = [];
    if (!empty($input['id'])) {
        $whereClause = "`id` = :w_id";
        $whereParams[':w_id'] = $input['id'];
    } else {
        $whereClause = buildDarsWhere($input, $whereParams);
    }

    $allParams = array_merge($updateParams, $whereParams);
    $sql = "UPDATE `{$table}` SET " . implode(', ', $fields) . " WHERE {$whereClause}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($allParams);

    echo json_encode(['success' => true, 'affected_rows' => $stmt->rowCount()], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'rest_delete') {
    $table = preg_replace('/[^a-zA-Z0-9_]/', '', $input['table'] ?? '');
    if (empty($table)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing table'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $whereParams = [];
    if (!empty($input['id'])) {
        $whereClause = "`id` = :w_id";
        $whereParams[':w_id'] = $input['id'];
    } elseif (!empty($input['ids']) && is_array($input['ids'])) {
        $placeholders = [];
        foreach ($input['ids'] as $idx => $idVal) {
            $pName = ":del_id_{$idx}";
            $placeholders[] = $pName;
            $whereParams[$pName] = $idVal;
        }
        $whereClause = "`id` IN (" . implode(',', $placeholders) . ")";
    } else {
        $whereClause = buildDarsWhere($input, $whereParams);
    }

    if ($whereClause === "1=1" || empty($whereClause)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unrestricted delete blocked'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM `{$table}` WHERE {$whereClause}");
    $stmt->execute($whereParams);

    echo json_encode(['success' => true, 'deleted_rows' => $stmt->rowCount()], JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// 7. BACKWARD COMPATIBILITY: FATURALAR (Company Bills)
// -------------------------------------------------------------
if ($method === 'GET' || $action === 'get_all' || $action === 'list') {
    $billsStmt = $pdo->query("SELECT * FROM company_bills ORDER BY created_at ASC");
    $bills = $billsStmt->fetchAll();

    $invStmt = $pdo->query("SELECT * FROM company_bill_invoices ORDER BY due_date DESC");
    $invoices = $invStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'bills' => $bills,
        'invoices' => $invoices
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'add_bill') {
    $id = !empty($input['id']) ? $input['id'] : gen_uuid();
    $now = date('c');

    $stmt = $pdo->prepare("
        INSERT INTO company_bills (id, name, subscriber_no, category, company, auto_payment, auto_payment_bank, current_amount, due_date, bill_status, notes, created_at, updated_at)
        VALUES (:id, :name, :subscriber_no, :category, :company, :auto_payment, :auto_payment_bank, :current_amount, :due_date, :bill_status, :notes, :created_at, :updated_at)
    ");
    $stmt->execute([
        ':id' => $id,
        ':name' => $input['name'] ?? '',
        ':subscriber_no' => $input['subscriber_no'] ?? '',
        ':category' => $input['category'] ?? 'elektrik',
        ':company' => $input['company'] ?? 'GENEL',
        ':auto_payment' => !empty($input['auto_payment']) ? 1 : 0,
        ':auto_payment_bank' => $input['auto_payment_bank'] ?? '',
        ':current_amount' => $input['current_amount'] ?? 0,
        ':due_date' => !empty($input['due_date']) ? $input['due_date'] : null,
        ':bill_status' => $input['bill_status'] ?? 'odenecek',
        ':notes' => $input['notes'] ?? '',
        ':created_at' => $now,
        ':updated_at' => $now
    ]);

    $fetch = $pdo->prepare("SELECT * FROM company_bills WHERE id = ?");
    $fetch->execute([$id]);
    $bill = $fetch->fetch();

    echo json_encode(['success' => true, 'bill' => $bill], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'update_bill') {
    $id = $input['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing ID'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $fields = [];
    $params = [':id' => $id];
    $allowed = ['name', 'subscriber_no', 'category', 'company', 'auto_payment', 'auto_payment_bank', 'current_amount', 'due_date', 'bill_status', 'last_paid_at', 'notes'];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $input)) {
            $fields[] = "`{$f}` = :{$f}";
            $val = $input[$f];
            if ($f === 'auto_payment') $val = !empty($val) ? 1 : 0;
            $params[":{$f}"] = $val;
        }
    }
    $fields[] = "`updated_at` = :updated_at";
    $params[':updated_at'] = date('c');

    $sql = "UPDATE company_bills SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_bill') {
    $id = $input['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing ID'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $pdo->prepare("DELETE FROM company_bill_invoices WHERE bill_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM company_bills WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'toggle_bill_status') {
    $id = $input['id'] ?? '';
    $billStatus = $input['bill_status'] ?? 'odendi';
    $lastPaidAt = $input['last_paid_at'] ?? null;

    $stmt = $pdo->prepare("UPDATE company_bills SET bill_status = ?, last_paid_at = ?, updated_at = ? WHERE id = ?");
    $stmt->execute([$billStatus, $lastPaidAt, date('c'), $id]);
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'add_invoice') {
    $id = !empty($input['id']) ? $input['id'] : gen_uuid();
    $now = date('c');

    $stmt = $pdo->prepare("
        INSERT INTO company_bill_invoices (id, bill_id, period, invoice_no, invoice_date, due_date, amount, paid_amount, status, paid_at, payment_method, notes, created_at, updated_at)
        VALUES (:id, :bill_id, :period, :invoice_no, :invoice_date, :due_date, :amount, :paid_amount, :status, :paid_at, :payment_method, :notes, :created_at, :updated_at)
    ");
    $stmt->execute([
        ':id' => $id,
        ':bill_id' => $input['bill_id'] ?? '',
        ':period' => $input['period'] ?? '',
        ':invoice_no' => $input['invoice_no'] ?? '',
        ':invoice_date' => !empty($input['invoice_date']) ? $input['invoice_date'] : null,
        ':due_date' => !empty($input['due_date']) ? $input['due_date'] : null,
        ':amount' => $input['amount'] ?? 0,
        ':paid_amount' => $input['paid_amount'] ?? 0,
        ':status' => $input['status'] ?? 'odenecek',
        ':paid_at' => !empty($input['paid_at']) ? $input['paid_at'] : null,
        ':payment_method' => $input['payment_method'] ?? '',
        ':notes' => $input['notes'] ?? '',
        ':created_at' => $now,
        ':updated_at' => $now
    ]);

    $fetch = $pdo->prepare("SELECT * FROM company_bill_invoices WHERE id = ?");
    $fetch->execute([$id]);
    $inv = $fetch->fetch();

    echo json_encode(['success' => true, 'invoice' => $inv], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'update_invoice') {
    $id = $input['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing ID'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $fields = [];
    $params = [':id' => $id];
    $allowed = ['period', 'invoice_no', 'invoice_date', 'due_date', 'amount', 'paid_amount', 'status', 'paid_at', 'payment_method', 'notes'];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $input)) {
            $fields[] = "`{$f}` = :{$f}";
            $params[":{$f}"] = $input[$f];
        }
    }
    $fields[] = "`updated_at` = :updated_at";
    $params[':updated_at'] = date('c');

    $sql = "UPDATE company_bill_invoices SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_invoice') {
    $id = $input['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing ID'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $pdo->prepare("DELETE FROM company_bill_invoices WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'toggle_invoice_status') {
    $id = $input['id'] ?? '';
    $status = $input['status'] ?? 'odendi';
    $paidAt = $input['paid_at'] ?? null;
    $paidAmount = $input['paid_amount'] ?? 0;

    $stmt = $pdo->prepare("UPDATE company_bill_invoices SET status = ?, paid_at = ?, paid_amount = ?, updated_at = ? WHERE id = ?");
    $stmt->execute([$status, $paidAt, $paidAmount, date('c'), $id]);

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Bilinmeyen işlem'], JSON_UNESCAPED_UNICODE);
