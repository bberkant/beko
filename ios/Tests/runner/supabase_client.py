"""
Supabase live network client and mock repository for DARS E2E Testing.
"""
import urllib.request
import urllib.error
import json
import time
from typing import Optional, List, Dict, Any

SUPABASE_URL = "https://zubhjybqzcpplultpsgt.supabase.co"
API_KEY = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG"
ADMIN_EMAIL = "admin@ops360.local"
ADMIN_PASSWORD = "123berkant_"

class SupabaseTestClient:
    def __init__(self, base_url: str = SUPABASE_URL, api_key: str = API_KEY):
        self.base_url = base_url
        self.api_key = api_key
        self.access_token: Optional[str] = None

    def authenticate(self, email: str = ADMIN_EMAIL, password: str = ADMIN_PASSWORD) -> str:
        url = f"{self.base_url}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }
        data = json.dumps({"email": email, "password": password}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                    self.access_token = payload["access_token"]
                    return self.access_token
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                if isinstance(e, urllib.error.HTTPError) and e.code < 500:
                    raise
                if attempt == 2:
                    raise
                time.sleep(0.5 * (attempt + 1))
        return ""

    def query_table(self, table: str, params: Optional[Dict[str, str]] = None, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        if not self.access_token:
            self.authenticate()

        query_str = f"select=*&limit={limit}&offset={offset}"
        if params:
            for k, v in params.items():
                query_str += f"&{k}={v}"

        url = f"{self.base_url}/rest/v1/{table}?{query_str}"
        headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.access_token}"
        }
        req = urllib.request.Request(url, headers=headers)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                if isinstance(e, urllib.error.HTTPError) and e.code < 500:
                    raise
                if attempt == 2:
                    raise
                time.sleep(0.5 * (attempt + 1))
        return []

    def count_table(self, table: str) -> int:
        if not self.access_token:
            self.authenticate()
        url = f"{self.base_url}/rest/v1/{table}?select=id&limit=1"
        headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.access_token}",
            "Prefer": "count=exact"
        }
        req = urllib.request.Request(url, headers=headers)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    cr = resp.headers.get("Content-Range")
                    if cr and "/" in cr:
                        return int(cr.split("/")[-1])
                    return 0
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                if isinstance(e, urllib.error.HTTPError) and e.code < 500:
                    raise
                if attempt == 2:
                    raise
                time.sleep(0.5 * (attempt + 1))
        return 0

    def check_connection(self) -> bool:
        try:
            self.authenticate()
            return True
        except Exception:
            return False
