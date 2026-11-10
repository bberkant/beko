<?php
/**
 * DARS Faturalar API Gateway
 * amasyaetas.com/dars/index.php
 */

// Hata ayarları
error_reporting(0);
ini_set('display_errors', '0');

// CORS ve JSON Başlıkları
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-DARS-KEY');

// Preflight OPTIONS sorgusunu yanıtla
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Güvenlik Anahtarı Kontrolü (DARS API Key)
$expectedKey = 'etas_dars_sec_89234710';
$providedKey = $_SERVER['HTTP_X_DARS_KEY'] ?? $_REQUEST['api_key'] ?? '';

if ($providedKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Yetkisiz erişim (Invalid DARS API Key)'], JSON_UNESCAPED_UNICODE);
    exit;
}

// cPanel Veritabanı Bağlantısı
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

// Tablolar yoksa otomatik oluştur
$pdo->exec("
CREATE TABLE IF NOT EXISTS company_bills (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subscriber_no VARCHAR(100) DEFAULT '',
    category VARCHAR(50) DEFAULT 'elektrik',
    company VARCHAR(50) DEFAULT 'ETİK',
    auto_payment TINYINT(1) DEFAULT 0,
    auto_payment_bank VARCHAR(100) DEFAULT '',
    current_amount DECIMAL(15,2) DEFAULT 0.00,
    due_date VARCHAR(50) DEFAULT NULL,
    bill_status VARCHAR(50) DEFAULT 'odenecek',
    last_paid_at VARCHAR(50) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at VARCHAR(50) DEFAULT NULL,
    updated_at VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_bill_invoices (
    id VARCHAR(64) PRIMARY KEY,
    bill_id VARCHAR(64) NOT NULL,
    period VARCHAR(50) DEFAULT '',
    invoice_no VARCHAR(100) DEFAULT '',
    invoice_date VARCHAR(50) DEFAULT NULL,
    due_date VARCHAR(50) DEFAULT NULL,
    amount DECIMAL(15,2) DEFAULT 0.00,
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'odenecek',
    paid_at VARCHAR(50) DEFAULT NULL,
    payment_method VARCHAR(100) DEFAULT '',
    notes TEXT DEFAULT NULL,
    created_at VARCHAR(50) DEFAULT NULL,
    updated_at VARCHAR(50) DEFAULT NULL,
    INDEX idx_bill_id (bill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Eğer company_bills tablosu boşsa, mevcut 22 faturayı otomatik aktar
$countStmt = $pdo->query("SELECT COUNT(*) FROM company_bills");
if ((int)$countStmt->fetchColumn() === 0) {
    $seedBills = [
        [
            'id' => '337b784a-219e-4921-a318-25b5e0b3e70b',
            'name' => "ATAKUM SU",
            'subscriber_no' => "0000000239143",
            'category' => "su",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-24',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:14:12.081028+00:00",
            'updated_at' => "2026-09-14T12:14:12.081028+00:00"
        ],
        [
            'id' => '47a59839-08e6-475a-94af-2572fc5af6be',
            'name' => "CEM YENİ EV ELEKTRİK",
            'subscriber_no' => "004003645325",
            'category' => "elektrik",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-14',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:19:39.651455+00:00",
            'updated_at' => "2026-09-14T12:19:39.651455+00:00"
        ],
        [
            'id' => '2fd072ec-173d-42f2-860c-d80055c35f7b',
            'name' => "CEM YENİ EV DOĞALGAZ",
            'subscriber_no' => "810001784012",
            'category' => "dogalgaz",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-14',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:19:53.9765+00:00",
            'updated_at' => "2026-09-14T12:19:53.9765+00:00"
        ],
        [
            'id' => '4438c7b7-4b9c-4a19-bf10-95646371ecee',
            'name' => "DEPO YENİ SUPERBOX",
            'subscriber_no' => "5350631150",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-14',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:21:09.71325+00:00",
            'updated_at' => "2026-09-14T12:21:09.71325+00:00"
        ],
        [
            'id' => '02888409-3865-402a-abaf-e3b1d93757f3',
            'name' => "OFİS ELEKTRİK",
            'subscriber_no' => "004003077585",
            'category' => "elektrik",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-11-08',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:25:13.674442+00:00",
            'updated_at' => "2026-10-28T10:56:33.035+00:00"
        ],
        [
            'id' => 'b1111111-1111-4111-8111-111111111111',
            'name' => "İLKADIM ELEKTRİK",
            'subscriber_no' => "4003036514",
            'category' => "elektrik",
            'company' => "ETİK",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 84081,
            'due_date' => '2026-09-10',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "Merkez fabrika elektrik aboneliği",
            'created_at' => "2026-09-13T12:07:54.443429+00:00",
            'updated_at' => "2026-09-14T12:23:14.816+00:00"
        ],
        [
            'id' => '90b71aff-a91d-4735-8f35-3a3e0554738d',
            'name' => "ATAKUM ELEKTRİK",
            'subscriber_no' => "4003036466",
            'category' => "elektrik",
            'company' => "ETİK",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 94207,
            'due_date' => '2026-08-10',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-13T12:40:16.911108+00:00",
            'updated_at' => "2026-09-14T12:23:21.717+00:00"
        ],
        [
            'id' => '1182ebe6-3f98-461c-838d-8f376d608a2d',
            'name' => "MERZİFON ELEKTRİK",
            'subscriber_no' => "004002983653",
            'category' => "elektrik",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-08-10',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:24:30.889455+00:00",
            'updated_at' => "2026-09-14T12:24:30.889455+00:00"
        ],
        [
            'id' => '0c836abe-283c-4b2c-818c-bb250c1b5e33',
            'name' => "OFİS SU",
            'subscriber_no' => "002956",
            'category' => "su",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-21',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:26:28.223336+00:00",
            'updated_at' => "2026-09-14T12:26:28.223336+00:00"
        ],
        [
            'id' => 'f9ec0ee2-5fef-479b-95d5-f14b8664b243',
            'name' => "OFİS TTNET",
            'subscriber_no' => "7050048890",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-16',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:27:58.225407+00:00",
            'updated_at' => "2026-09-14T12:27:58.225407+00:00"
        ],
        [
            'id' => '5136a6d5-57e7-4289-b509-b0c08cda9b0f',
            'name' => "OFİS YENİ SUPERBOX",
            'subscriber_no' => "5350631125",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-14',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:29:19.923175+00:00",
            'updated_at' => "2026-09-14T12:29:19.923175+00:00"
        ],
        [
            'id' => '581b3529-d69e-46fd-8ed8-6f2714623466',
            'name' => "ŞİŞMANLAR ELEKTRİK",
            'subscriber_no' => "004003157628",
            'category' => "elektrik",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-14',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:30:22.737416+00:00",
            'updated_at' => "2026-09-14T12:30:22.737416+00:00"
        ],
        [
            'id' => '5ff20a1f-1ed6-4858-8331-71f295db490a',
            'name' => "SUCUKHANE ELEKTRİK",
            'subscriber_no' => "004002939958",
            'category' => "elektrik",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-10',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:30:59.672387+00:00",
            'updated_at' => "2026-09-14T12:30:59.672387+00:00"
        ],
        [
            'id' => '2e27b926-7340-4e6d-b2bb-5cc0be92e89d',
            'name' => "TELEKOM YENİ ŞİRKET HATTI",
            'subscriber_no' => "9949723018",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-16',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:43:26.857718+00:00",
            'updated_at' => "2026-09-14T12:43:26.857718+00:00"
        ],
        [
            'id' => '14925e4d-5b3a-4fe6-9227-59ec15509927',
            'name' => "VETERİNER YENİ SUPERBOX",
            'subscriber_no' => "5350631151",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-09-14',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:45:02.942256+00:00",
            'updated_at' => "2026-09-14T12:45:02.942256+00:00"
        ],
        [
            'id' => '6a9f1dd0-d26b-452b-a9cd-3ff63c8f4e8a',
            'name' => "AKSA TOKAT DOĞALGAZ",
            'subscriber_no' => "800003961898",
            'category' => "dogalgaz",
            'company' => "GENEL",
            'auto_payment' => 1,
            'auto_payment_bank' => "E.GARANTİDEYDİ KUVEYT ALDIK",
            'current_amount' => 0,
            'due_date' => '2026-09-29',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T13:41:54.650727+00:00",
            'updated_at' => "2026-09-14T13:42:15.85+00:00"
        ],
        [
            'id' => 'd1fb2777-6bb1-4d8b-9707-7b59a73f594f',
            'name' => "CEM İNTERNET",
            'subscriber_no' => "7026981925",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-10-02',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "MARİF ZİRAAT",
            'created_at' => "2026-09-14T12:51:02.951932+00:00",
            'updated_at' => "2026-10-02T13:48:39.741+00:00"
        ],
        [
            'id' => '166c0f26-43d9-425c-a4e0-153254e9ddf5',
            'name' => "APO ABİ ŞİRKET HATTI",
            'subscriber_no' => "05304540561",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 1,
            'auto_payment_bank' => "KUVEYT",
            'current_amount' => 0,
            'due_date' => '2026-09-04',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T13:08:19.143503+00:00",
            'updated_at' => "2026-11-04T10:24:47.837+00:00"
        ],
        [
            'id' => 'b704426e-17f2-4202-b086-409474b4c010',
            'name' => "5384275521",
            'subscriber_no' => "5384275521",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-11-05',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "NE OLDUĞU BİLİNMİYOR",
            'created_at' => "2026-09-14T12:44:31.777605+00:00",
            'updated_at' => "2026-11-05T12:45:44.128+00:00"
        ],
        [
            'id' => '799f0f35-bc85-4472-8513-bb42e0b74b96',
            'name' => "5314048109",
            'subscriber_no' => "5314048109",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-11-05',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "NE OLDUĞU BİLİNMİYOR",
            'created_at' => "2026-09-14T12:44:45.117459+00:00",
            'updated_at' => "2026-11-05T12:45:52.181+00:00"
        ],
        [
            'id' => 'b09e3525-6e03-466d-9923-661835bb4547',
            'name' => "5342808174",
            'subscriber_no' => "5342808174",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 0,
            'auto_payment_bank' => "",
            'current_amount' => 0,
            'due_date' => '2026-11-05',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "NE OLDUĞU BİLİNMİYOR",
            'created_at' => "2026-11-04T10:13:13.241405+00:00",
            'updated_at' => "2026-11-05T12:45:59.898+00:00"
        ],
        [
            'id' => 'f0b831bc-705f-42f0-92e6-45147f8820ef',
            'name' => "CEM 532",
            'subscriber_no' => "5326118132",
            'category' => "internet_telefon",
            'company' => "GENEL",
            'auto_payment' => 1,
            'auto_payment_bank' => "KUVEYT",
            'current_amount' => 0,
            'due_date' => '2026-09-05',
            'bill_status' => "odenecek",
            'last_paid_at' => null,
            'notes' => "",
            'created_at' => "2026-09-14T12:18:22.924117+00:00",
            'updated_at' => "2026-11-05T12:46:13.963+00:00"
        ]
    ];

    $insertSeed = $pdo->prepare("
        INSERT INTO company_bills (id, name, subscriber_no, category, company, auto_payment, auto_payment_bank, current_amount, due_date, bill_status, last_paid_at, notes, created_at, updated_at)
        VALUES (:id, :name, :subscriber_no, :category, :company, :auto_payment, :auto_payment_bank, :current_amount, :due_date, :bill_status, :last_paid_at, :notes, :created_at, :updated_at)
    ");

    foreach ($seedBills as $b) {
        $insertSeed->execute([
            ':id' => $b['id'],
            ':name' => $b['name'],
            ':subscriber_no' => $b['subscriber_no'],
            ':category' => $b['category'],
            ':company' => $b['company'],
            ':auto_payment' => $b['auto_payment'],
            ':auto_payment_bank' => $b['auto_payment_bank'],
            ':current_amount' => $b['current_amount'],
            ':due_date' => $b['due_date'],
            ':bill_status' => $b['bill_status'],
            ':last_paid_at' => $b['last_paid_at'],
            ':notes' => $b['notes'],
            ':created_at' => $b['created_at'],
            ':updated_at' => $b['updated_at']
        ]);
    }
}

// JSON girdisini al
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Rastgele UUID fonksiyonu
function gen_uuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// GET: Tüm faturaları ve hareketleri listele
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

// POST: Yeni Fatura Kurumu Ekle
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

// POST: Fatura Kurumu Güncelle
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
            $fields[] = "{$f} = :{$f}";
            $val = $input[$f];
            if ($f === 'auto_payment') $val = !empty($val) ? 1 : 0;
            $params[":{$f}"] = $val;
        }
    }

    $fields[] = "updated_at = :updated_at";
    $params[':updated_at'] = date('c');

    $sql = "UPDATE company_bills SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST: Fatura Kurumu Sil
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

// POST: Fatura Durumu Değiştir (Ödendi / Ödenecek)
if ($action === 'toggle_bill_status') {
    $id = $input['id'] ?? '';
    $billStatus = $input['bill_status'] ?? 'odendi';
    $lastPaidAt = $input['last_paid_at'] ?? null;

    $stmt = $pdo->prepare("UPDATE company_bills SET bill_status = ?, last_paid_at = ?, updated_at = ? WHERE id = ?");
    $stmt->execute([$billStatus, $lastPaidAt, date('c'), $id]);

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST: Fatura Hareketi (Dönem Faturası) Ekle
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

// POST: Fatura Hareketi Güncelle
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
            $fields[] = "{$f} = :{$f}";
            $params[":{$f}"] = $input[$f];
        }
    }

    $fields[] = "updated_at = :updated_at";
    $params[':updated_at'] = date('c');

    $sql = "UPDATE company_bill_invoices SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST: Fatura Hareketi Sil
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

// POST: Fatura Hareketi Durumu Değiştir
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
