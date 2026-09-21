"""
Milestone 1 Source Code Integrity and Syntax Balance Verification.
Genuinely scans dars-ios/ to ensure:
- 0 flat Swift files in root directory
- All 32+ Swift files exist across modular folders
- 100% balanced syntax (braces, brackets, parentheses) across every Swift file
- Kuveyt Türk Design System tokens and theme components are declared
- VCornerDecorations is declared public with public init() and instantiated in LoginView
- SettingsView is declared public with public init() and instantiated in MenuView
"""
import os
import sys
import re
import unittest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DARS_DIR = os.path.join(ROOT_DIR, "dars-ios")


def strip_swift_comments_and_strings(code: str) -> str:
    """Strip Swift comments and string literals to accurately scan syntax balance."""
    result = []
    i = 0
    n = len(code)
    state = "NORMAL"

    while i < n:
        if state == "NORMAL":
            if code[i:i+2] == "//":
                state = "LINE_COMMENT"
                i += 2
            elif code[i:i+2] == "/*":
                state = "BLOCK_COMMENT"
                i += 2
            elif code[i] == '"':
                state = "STRING"
                i += 1
            else:
                result.append(code[i])
                i += 1
        elif state == "LINE_COMMENT":
            if code[i] == "\n":
                result.append("\n")
                state = "NORMAL"
            i += 1
        elif state == "BLOCK_COMMENT":
            if code[i:i+2] == "*/":
                state = "NORMAL"
                i += 2
            else:
                i += 1
        elif state == "STRING":
            if code[i] == "\\":
                i += 2
            elif code[i] == '"':
                state = "NORMAL"
                i += 1
            else:
                i += 1
    return "".join(result)


class TestSourceIntegrity(unittest.TestCase):
    """Verifies file structure, modularization, syntax balance, and Design System tokens."""

    def test_no_flat_swift_files_in_root(self):
        """Verify zero flat .swift files in dars-ios root directory."""
        self.assertTrue(os.path.isdir(DARS_DIR), f"Directory {DARS_DIR} does not exist")
        entries = os.listdir(DARS_DIR)
        root_swift_files = [f for f in entries if f.endswith(".swift") and os.path.isfile(os.path.join(DARS_DIR, f))]
        self.assertEqual(
            root_swift_files, [],
            f"Found flat .swift files in dars-ios root: {root_swift_files}"
        )

    def test_swift_file_inventory_count_at_least_32(self):
        """Verify at least 32 Swift files exist in modular subdirectories."""
        all_swift_files = []
        for root, _, files in os.walk(DARS_DIR):
            for f in files:
                if f.endswith(".swift"):
                    all_swift_files.append(os.path.relpath(os.path.join(root, f), DARS_DIR))

        self.assertGreaterEqual(
            len(all_swift_files), 32,
            f"Expected at least 32 Swift files in dars-ios, found {len(all_swift_files)}: {all_swift_files}"
        )

    def test_syntax_balance_all_swift_files(self):
        """Verify braces, brackets, and parentheses are 100% balanced across all Swift files."""
        swift_files = []
        for root, _, files in os.walk(DARS_DIR):
            for f in files:
                if f.endswith(".swift"):
                    swift_files.append(os.path.join(root, f))

        mismatches = []
        for path in swift_files:
            rel = os.path.relpath(path, ROOT_DIR)
            with open(path, "r", encoding="utf-8") as f:
                raw_code = f.read()
            clean_code = strip_swift_comments_and_strings(raw_code)

            open_b, close_b = clean_code.count("{"), clean_code.count("}")
            open_p, close_p = clean_code.count("("), clean_code.count(")")
            open_k, close_k = clean_code.count("["), clean_code.count("]")

            if open_b != close_b:
                mismatches.append(f"{rel}: braces mismatch ({open_b} open vs {close_b} close)")
            if open_p != close_p:
                mismatches.append(f"{rel}: parens mismatch ({open_p} open vs {close_p} close)")
            if open_k != close_k:
                mismatches.append(f"{rel}: brackets mismatch ({open_k} open vs {close_k} close)")

        self.assertEqual(mismatches, [], f"Syntax balance failures found:\n" + "\n".join(mismatches))

    def test_design_system_tokens_and_colors(self):
        """Verify Kuveyt Türk corporate brand color tokens in Colors.swift."""
        colors_file = os.path.join(DARS_DIR, "Core", "DesignSystem", "Colors.swift")
        self.assertTrue(os.path.isfile(colors_file), f"Colors.swift missing at {colors_file}")

        with open(colors_file, "r", encoding="utf-8") as f:
            content = f.read()

        expected_tokens = [
            "ktPrimary",
            "ktPrimaryDark",
            "ktPrimaryLight",
            "ktCoral",
            "ktCoralDark",
            "ktCoralLight",
            "ktOrange",
            "ktOrangeLight",
            "ktPageBackground",
            "ktCardSurface",
            "ktCardBorder",
            "ktSuccess",
            "ktDanger",
            "brandGreen",
            "systemLightGray"
        ]
        for token in expected_tokens:
            self.assertIn(f"let {token}", content, f"Brand color token '{token}' missing in Colors.swift")

    def test_design_system_components_presence(self):
        """Verify all essential Milestone 1 UI components exist."""
        components = [
            ("Core/DesignSystem/Theme.swift", "KTTheme"),
            ("Core/DesignSystem/Typography.swift", "ktTitle"),
            ("Core/DesignSystem/Components/KTCard.swift", "KTCard"),
            ("Core/DesignSystem/Components/KTPill.swift", "KTPill"),
            ("Core/DesignSystem/Components/KTButton.swift", "KTButton"),
            ("Core/DesignSystem/Components/KTSegmentedControl.swift", "KTSegmentedControl"),
            ("Core/DesignSystem/Components/VCornerDecorations.swift", "VCornerDecorations"),
        ]
        for rel_path, symbol in components:
            full_path = os.path.join(DARS_DIR, rel_path)
            self.assertTrue(os.path.isfile(full_path), f"Component file {rel_path} missing")
            with open(full_path, "r", encoding="utf-8") as f:
                code = f.read()
            self.assertIn(symbol, code, f"Symbol '{symbol}' not found in {rel_path}")

    def test_vcornerdecorations_declaration_and_usage(self):
        """Verify VCornerDecorations has public struct & public init, and is instantiated in LoginView."""
        decor_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Components", "VCornerDecorations.swift")
        self.assertTrue(os.path.isfile(decor_path), f"VCornerDecorations.swift missing at {decor_path}")

        with open(decor_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertRegex(
            content, r"public\s+struct\s+VCornerDecorations\s*:\s*View",
            "VCornerDecorations must be declared as 'public struct VCornerDecorations: View'"
        )
        self.assertRegex(
            content, r"public\s+init\s*\(\s*\)",
            "VCornerDecorations must provide a 'public init()' initializer"
        )

        login_path = os.path.join(DARS_DIR, "Features", "Auth", "LoginView.swift")
        self.assertTrue(os.path.isfile(login_path), f"LoginView.swift missing at {login_path}")
        with open(login_path, "r", encoding="utf-8") as f:
            login_content = f.read()
        self.assertIn(
            "VCornerDecorations()", login_content,
            "LoginView must instantiate VCornerDecorations()"
        )

    def test_settingsview_declaration_and_usage(self):
        """Verify SettingsView has public struct & public init, @AppStorage, and is instantiated in MenuView."""
        settings_path = os.path.join(DARS_DIR, "Features", "Menu", "SettingsView.swift")
        self.assertTrue(os.path.isfile(settings_path), f"SettingsView.swift missing at {settings_path}")

        with open(settings_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertRegex(
            content, r"public\s+struct\s+SettingsView\s*:\s*View",
            "SettingsView must be declared as 'public struct SettingsView: View'"
        )
        self.assertRegex(
            content, r"public\s+init\s*\(\s*\)",
            "SettingsView must provide a 'public init()' initializer"
        )
        self.assertIn("@AppStorage", content, "SettingsView must use @AppStorage for persistence")

        menu_path = os.path.join(DARS_DIR, "Features", "Menu", "MenuView.swift")
        self.assertTrue(os.path.isfile(menu_path), f"MenuView.swift missing at {menu_path}")
        with open(menu_path, "r", encoding="utf-8") as f:
            menu_content = f.read()
        self.assertIn(
            "SettingsView()", menu_content,
            "MenuView must instantiate SettingsView() in navigation"
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
