"""
Domain models, calculation engines, and business rules for DARS E2E Testing.
Derived directly from ios_prototype.html, PROJECT.md, and spec_report.md.
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict
import uuid

ORGANIZATION_ID = "13b8da90-27d1-440d-a8f4-eb50dadd6391"

@dataclass
class CheckRecord:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    amount: float = 0.0
    bank_name: str = "M.DENİZ"
    bank_branch: str = "Merkez"
    check_no: str = "CK-00000"
    check_type: str = "alinan"
    document_type: str = "cek"
    due_date: str = "2026-09-03"
    kesideci: str = "BURAK BESİCİLİK"
    status: str = "Tahsilde"
    organization_id: str = ORGANIZATION_ID
    is_ic_takas: bool = False

@dataclass
class SlaughterRecord:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    slaughter_date: str = "2026-08-12"
    supplier: str = "DİVAN HAYVANCILIK"
    head_count: int = 27
    animal_type: str = "DÜVE"
    carcass_weight: float = 8692.0
    price_per_kg: float = 575.0
    total_amount: Optional[float] = None
    pesinat: float = 0.0
    kalan_tutar: Optional[float] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None
    organization_id: str = ORGANIZATION_ID

    def __post_init__(self):
        if self.total_amount is None:
            self.total_amount = round(self.carcass_weight * self.price_per_kg, 2)
        if self.kalan_tutar is None:
            self.kalan_tutar = max(0.0, self.total_amount - self.pesinat)

@dataclass
class CariSummary:
    supplier: str
    head_count: int
    carcass_weight: float
    total_amount: float
    pesinat: float
    kalan_tutar: float
    last_slaughter_date: str

@dataclass
class CektenRecord:
    id: int
    date: str
    supplier: str
    total: float
    paid: float
    remain: float
    due_date: str
    notes: str = ""

@dataclass
class VehicleRecord:
    id: str
    plate: str
    brand: str
    model: str
    year: int
    days_left: int
    active_driver: Optional[str] = None

    @property
    def is_inspection_critical(self) -> bool:
        """Inspection criticality indicator (<= 10 days remaining or overdue)."""
        return self.days_left <= 10

@dataclass
class CreditCardRecord:
    id: int
    bank: str
    name: str
    last4: str
    limit: float
    used: float
    min_pay: float = 0.0
    due_date: str = ""
    min_payment_rate: float = 0.20

    def calculate_min_payment(self) -> float:
        """Calculates minimum payment based on current debt and rate."""
        return round(self.used * self.min_payment_rate, 2)

    @property
    def available_limit(self) -> float:
        return max(0.0, self.limit - self.used)

class CektenCalculator:
    """Mathematical engine for ÇEKTEN cost and yield computation."""
    @staticmethod
    def calculate_cost(amount: float, days: int) -> float:
        """Formula: Maliyet = Tutar * (Gun / 360) * 0.45"""
        if days <= 0 or amount <= 0:
            return 0.0
        return round(amount * (days / 360.0) * 0.45, 2)

    @staticmethod
    def calculate_net(amount: float, days: int) -> float:
        """Formula: Net = Tutar - Maliyet"""
        cost = CektenCalculator.calculate_cost(amount, days)
        return round(amount - cost, 2)

    @staticmethod
    def apply_payment(total: float, current_paid: float, payment_amount: float) -> tuple[float, float]:
        """Returns (new_paid, new_remain) clamped at 0."""
        new_paid = current_paid + payment_amount
        new_remain = max(0.0, total - new_paid)
        return new_paid, round(new_remain, 2)

class CariClassifier:
    """Classifies counterparty balance into BORCLU, ALACAKLI, or SIFIR."""
    @staticmethod
    def classify(balance: float) -> str:
        if balance > 0:
            return "BORCLU"
        elif balance < 0:
            return "ALACAKLI"
        return "SIFIR"

    @staticmethod
    def badge_style(balance: float) -> tuple[str, str]:
        """Returns (label, color_token)."""
        if balance > 0:
            return ("Kalan", "rose")
        elif balance < 0:
            return ("Alacak", "emerald")
        return ("Sıfır", "slate")

class TurkishTextNormalizer:
    """Normalizes Turkish specific unicode characters for fault-tolerant search."""
    TRANSLATION = str.maketrans({
        "İ": "i", "I": "i", "ı": "i",
        "Ğ": "g", "ğ": "g",
        "Ü": "u", "ü": "u",
        "Ş": "s", "ş": "s",
        "Ö": "o", "ö": "o",
        "Ç": "c", "ç": "c"
    })

    @staticmethod
    def normalize(text: str) -> str:
        return text.translate(TurkishTextNormalizer.TRANSLATION).lower()

    @staticmethod
    def matches(source: str, query: str) -> bool:
        return TurkishTextNormalizer.normalize(query) in TurkishTextNormalizer.normalize(source)
