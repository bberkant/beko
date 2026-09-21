#!/usr/bin/env python3
"""
Empirical Adversarial Test Suite for Milestone 1:
Architectural Reorganization, XcodeGen, Design System, Asset Integrity, and Symbol Resolution.

Executes 8 test groups with opaque-box checks, binary PNG inspections, AST-like lexical scanning,
symbol cross-referencing, and layout invariants.
"""

import os
import sys
import json
import struct
import zlib
import re
import plistlib
import unittest
import subprocess

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DARS_IOS_DIR = os.path.join(REPO_ROOT, "dars-ios")


def strip_swift_comments_and_strings(code: str) -> str:
    """Strip Swift comments and string literals to accurately scan syntax balance."""
    result = []
    i = 0
    n = len(code)
    state = "NORMAL" # NORMAL, LINE_COMMENT, BLOCK_COMMENT, STRING, RAW_STRING
    
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
            if code[i] == '\n':
                result.append('\n')
                state = "NORMAL"
            i += 1
        elif state == "BLOCK_COMMENT":
            if code[i:i+2] == "*/":
                state = "NORMAL"
                i += 2
            else:
                i += 1
        elif state == "STRING":
            if code[i] == '\\':
                i += 2 # Skip escaped character
            elif code[i] == '"':
                state = "NORMAL"
                i += 1
            else:
                i += 1
    return "".join(result)


class TestM1AdversarialVerification(unittest.TestCase):

    # ----------------------------------------------------------------------
    # GROUP 1: Root Layout & Directory Hierarchy Invariants
    # ----------------------------------------------------------------------
    def test_group1_no_flat_swift_files_in_dars_ios_root(self):
        """Verify that absolutely NO flat .swift files remain in dars-ios root."""
        entries = os.listdir(DARS_IOS_DIR)
        root_swift_files = [f for f in entries if f.endswith(".swift") and os.path.isfile(os.path.join(DARS_IOS_DIR, f))]
        self.assertEqual(
            root_swift_files,
            [],
            f"Adversarial violation: Found {len(root_swift_files)} flat .swift files in dars-ios root: {root_swift_files}"
        )

    def test_group1_modular_directory_structure_exists(self):
        """Verify all expected modular directories per PROJECT.md layout exist."""
        expected_dirs = [
            "App",
            "Core/DesignSystem",
            "Core/DesignSystem/Components",
            "Core/Models",
            "Core/Network",
            "Features/Auth",
            "Features/Cariler",
            "Features/Checks",
            "Features/Dashboard",
            "Features/MainTab",
            "Features/Menu",
            "Features/Menu/SubScreens",
            "Tests",
            "Tests/TestSupport"
        ]
        for rel_dir in expected_dirs:
            full_path = os.path.join(DARS_IOS_DIR, rel_dir)
            self.assertTrue(
                os.path.isdir(full_path),
                f"Missing required modular directory: {rel_dir}"
            )

    def test_group1_agents_metadata_compliance(self):
        """Verify .agents/ contains only metadata files (.md, .json, .log), no .swift files."""
        agents_dir = os.path.join(REPO_ROOT, ".agents")
        swift_files_in_agents = []
        for root, _, files in os.walk(agents_dir):
            for f in files:
                if f.endswith(".swift"):
                    swift_files_in_agents.append(os.path.relpath(os.path.join(root, f), REPO_ROOT))
        self.assertEqual(
            swift_files_in_agents,
            [],
            f"Found Swift source code inside .agents/ metadata directory: {swift_files_in_agents}"
        )

    # ----------------------------------------------------------------------
    # GROUP 2: XcodeGen project.yml Specification Soundness
    # ----------------------------------------------------------------------
    def test_group2_project_yml_validity(self):
        """Verify project.yml exists, is parseable, and has correct target architecture."""
        project_yml_path = os.path.join(REPO_ROOT, "project.yml")
        self.assertTrue(os.path.isfile(project_yml_path), "project.yml does not exist at repo root")
        
        with open(project_yml_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check key sections
        self.assertIn("name: dars-ios", content)
        self.assertIn("bundleIdPrefix: com.amasyaetas", content)
        self.assertIn("supabase-swift", content)
        self.assertIn("https://github.com/supabase/supabase-swift.git", content)
        self.assertIn("from: \"2.5.0\"", content)

        # Check targets
        self.assertIn("dars-ios:", content)
        self.assertIn("type: application", content)
        self.assertIn("PRODUCT_BUNDLE_IDENTIFIER: com.amasyaetas.mobile", content)
        self.assertIn("DEVELOPMENT_TEAM: WGARWL7QZ4", content)
        self.assertIn("INFOPLIST_FILE: dars-ios/App/Info.plist", content)
        self.assertIn("ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon", content)
        self.assertIn("ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: AccentColor", content)
        self.assertIn("dars-iosTests:", content)
        self.assertIn("type: bundle.unit-test", content)

    # ----------------------------------------------------------------------
    # GROUP 3: Asset Catalog Forensics & Binary Integrity
    # ----------------------------------------------------------------------
    def test_group3_asset_catalog_json_headers(self):
        """Verify all Contents.json files in Assets.xcassets are valid JSON with required Xcode info."""
        xcassets_dir = os.path.join(DARS_IOS_DIR, "App", "Assets.xcassets")
        self.assertTrue(os.path.isdir(xcassets_dir), "Assets.xcassets directory missing")

        json_files = [
            os.path.join(xcassets_dir, "Contents.json"),
            os.path.join(xcassets_dir, "AccentColor.colorset", "Contents.json"),
            os.path.join(xcassets_dir, "AppIcon.appiconset", "Contents.json")
        ]

        for json_path in json_files:
            self.assertTrue(os.path.isfile(json_path), f"Missing JSON: {json_path}")
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.assertIn("info", data, f"Missing 'info' object in {json_path}")
            self.assertEqual(data["info"].get("version"), 1)
            self.assertEqual(data["info"].get("author"), "xcode")

    def test_group3_accent_color_specification(self):
        """Verify AccentColor matches Kuveyt Türk signature Navy (#002D59 -> 0, 0.176, 0.349)."""
        accent_json_path = os.path.join(DARS_IOS_DIR, "App", "Assets.xcassets", "AccentColor.colorset", "Contents.json")
        with open(accent_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        colors = data.get("colors", [])
        self.assertGreater(len(colors), 0, "No colors found in AccentColor.colorset")
        comp = colors[0]["color"]["components"]
        self.assertEqual(comp.get("red"), "0.000")
        self.assertEqual(comp.get("green"), "0.176")
        self.assertEqual(comp.get("blue"), "0.349")
        self.assertEqual(comp.get("alpha"), "1.000")

    def test_group3_app_icon_binary_png_integrity(self):
        """Verify icon-1024.png is a genuine 1024x1024 PNG with valid IHDR, IDAT, and IEND chunks."""
        icon_path = os.path.join(DARS_IOS_DIR, "App", "Assets.xcassets", "AppIcon.appiconset", "icon-1024.png")
        self.assertTrue(os.path.isfile(icon_path), f"icon-1024.png does not exist at {icon_path}")
        
        file_size = os.path.getsize(icon_path)
        self.assertGreater(file_size, 1000, f"icon-1024.png file size {file_size} bytes is suspiciously small")

        with open(icon_path, "rb") as f:
            header = f.read(8)
            # PNG Magic Number: 89 50 4E 47 0D 0A 1A 0A
            self.assertEqual(header, b'\x89PNG\r\n\x1a\n', "Invalid PNG magic signature")

            # First Chunk: IHDR
            ihdr_len_bytes = f.read(4)
            ihdr_len = struct.unpack(">I", ihdr_len_bytes)[0]
            ihdr_type = f.read(4)
            self.assertEqual(ihdr_type, b'IHDR', "First PNG chunk is not IHDR")
            
            ihdr_data = f.read(ihdr_len)
            width, height, bit_depth, color_type, comp_meth, filt_meth, interlace = struct.unpack(">IIBBBBB", ihdr_data)
            self.assertEqual(width, 1024, f"Expected PNG width 1024, got {width}")
            self.assertEqual(height, 1024, f"Expected PNG height 1024, got {height}")
            self.assertEqual(bit_depth, 8, f"Expected bit depth 8, got {bit_depth}")
            self.assertIn(color_type, (2, 6), f"Expected color type RGB(2) or RGBA(6), got {color_type}")
            
            ihdr_crc = f.read(4)
            calculated_crc = zlib.crc32(ihdr_type + ihdr_data) & 0xffffffff
            expected_crc = struct.unpack(">I", ihdr_crc)[0]
            self.assertEqual(calculated_crc, expected_crc, "IHDR CRC checksum mismatch")

            # Scan remaining chunks until IEND
            has_idat = False
            has_iend = False
            while True:
                chunk_len_bytes = f.read(4)
                if not chunk_len_bytes or len(chunk_len_bytes) < 4:
                    break
                chunk_len = struct.unpack(">I", chunk_len_bytes)[0]
                chunk_type = f.read(4)
                chunk_data = f.read(chunk_len)
                chunk_crc = f.read(4)
                
                # Check CRC
                calc_crc = zlib.crc32(chunk_type + chunk_data) & 0xffffffff
                exp_crc = struct.unpack(">I", chunk_crc)[0]
                self.assertEqual(calc_crc, exp_crc, f"CRC mismatch in chunk {chunk_type}")

                if chunk_type == b'IDAT':
                    has_idat = True
                elif chunk_type == b'IEND':
                    has_iend = True
                    break

            self.assertTrue(has_idat, "PNG has no IDAT data chunk")
            self.assertTrue(has_iend, "PNG has no IEND termination chunk")

    # ----------------------------------------------------------------------
    # GROUP 4: Info.plist Structural & Permission Integrity
    # ----------------------------------------------------------------------
    def test_group4_info_plist_validity(self):
        """Verify Info.plist is a valid plist with all corporate iOS permissions."""
        plist_path = os.path.join(DARS_IOS_DIR, "App", "Info.plist")
        self.assertTrue(os.path.isfile(plist_path), "Info.plist does not exist")

        with open(plist_path, "rb") as f:
            plist = plistlib.load(f)

        self.assertEqual(plist.get("CFBundleDisplayName"), "DARS")
        self.assertEqual(plist.get("UIUserInterfaceStyle"), "Light")
        self.assertFalse(plist.get("ITSAppUsesNonExemptEncryption"))
        
        # Check permissions
        required_permissions = [
            "NSFaceIDUsageDescription",
            "NSCameraUsageDescription",
            "NSPhotoLibraryUsageDescription",
            "NSPhotoLibraryAddUsageDescription"
        ]
        for perm in required_permissions:
            val = plist.get(perm)
            self.assertIsNotNone(val, f"Missing required Info.plist permission: {perm}")
            self.assertGreater(len(val.strip()), 10, f"Permission description too short for {perm}")

    # ----------------------------------------------------------------------
    # GROUP 5: Symbol Resolution & Access Level Verification
    # ----------------------------------------------------------------------
    def test_group5_vcornerdecorations_declaration(self):
        """Verify VCornerDecorations is declared with public access and parameterless init."""
        decor_path = os.path.join(DARS_IOS_DIR, "Core", "DesignSystem", "Components", "VCornerDecorations.swift")
        self.assertTrue(os.path.isfile(decor_path), "VCornerDecorations.swift missing")

        with open(decor_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertRegex(content, r"public\s+struct\s+VCornerDecorations\s*:\s*View", "VCornerDecorations must be 'public struct VCornerDecorations: View'")
        self.assertRegex(content, r"public\s+init\s*\(\s*\)", "VCornerDecorations must have 'public init()'")

    def test_group5_settingsview_declaration(self):
        """Verify SettingsView is declared with public access and parameterless init."""
        settings_path = os.path.join(DARS_IOS_DIR, "Features", "Menu", "SettingsView.swift")
        self.assertTrue(os.path.isfile(settings_path), "SettingsView.swift missing")

        with open(settings_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertRegex(content, r"public\s+struct\s+SettingsView\s*:\s*View", "SettingsView must be 'public struct SettingsView: View'")
        self.assertRegex(content, r"public\s+init\s*\(\s*\)", "SettingsView must have 'public init()'")

    def test_group5_loginview_uses_vcornerdecorations(self):
        """Verify LoginView references VCornerDecorations with 0 arguments."""
        login_path = os.path.join(DARS_IOS_DIR, "Features", "Auth", "LoginView.swift")
        self.assertTrue(os.path.isfile(login_path), "LoginView.swift missing")

        with open(login_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("VCornerDecorations()", content, "LoginView must call VCornerDecorations()")

    def test_group5_menuview_uses_settingsview(self):
        """Verify MenuView references SettingsView in NavigationLink."""
        menu_path = os.path.join(DARS_IOS_DIR, "Features", "Menu", "MenuView.swift")
        self.assertTrue(os.path.isfile(menu_path), "MenuView.swift missing")

        with open(menu_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("SettingsView()", content, "MenuView must call SettingsView()")

    def test_group5_no_unscoped_helper_symbol_collisions(self):
        """Verify helper structs (MenuRow, TabButton, GridStatsView, StatBox, ChartBar) are fileprivate."""
        helpers = ["MenuRow", "TabButton", "GridStatsView", "StatBox", "ChartBar"]
        
        for root, _, files in os.walk(DARS_IOS_DIR):
            if "Tests" in root:
                continue
            for f in files:
                if not f.endswith(".swift"):
                    continue
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8") as fp:
                    content = fp.read()
                
                for helper in helpers:
                    pattern = rf"(public\s+|internal\s+)?struct\s+{helper}\b"
                    match = re.search(pattern, content)
                    if match:
                        full_match = match.group(0)
                        # Ensure it is prefixed with fileprivate or private
                        line = [l for l in content.splitlines() if f"struct {helper}" in l][0]
                        self.assertTrue(
                            "fileprivate" in line or "private" in line,
                            f"Helper '{helper}' in {os.path.relpath(path, REPO_ROOT)} must be fileprivate or private: '{line.strip()}'"
                        )

    # ----------------------------------------------------------------------
    # GROUP 6: Design System Tokens & Brand Backwards Compatibility
    # ----------------------------------------------------------------------
    def test_group6_colors_and_design_system_tokens(self):
        """Verify all Kuveyt Türk brand color tokens are declared in Colors.swift."""
        colors_path = os.path.join(DARS_IOS_DIR, "Core", "DesignSystem", "Colors.swift")
        self.assertTrue(os.path.isfile(colors_path), "Colors.swift missing")

        with open(colors_path, "r", encoding="utf-8") as f:
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
            self.assertIn(f"let {token}", content, f"Token {token} not found in Colors.swift")

    def test_group6_no_duplicate_brandgreen_in_models(self):
        """Verify Models.swift does NOT have a duplicate Color extension for brandGreen."""
        models_path = os.path.join(DARS_IOS_DIR, "Core", "Models", "Models.swift")
        with open(models_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("extension Color", content, "Models.swift must not define duplicate Color extension")
        self.assertNotIn("brandGreen = Color", content, "Models.swift must not define brandGreen")

    # ----------------------------------------------------------------------
    # GROUP 7: Syntactic Balance Across All Swift Files
    # ----------------------------------------------------------------------
    def test_group7_syntax_balance_all_swift_files(self):
        """Verify all .swift files across dars-ios have balanced braces, brackets, and parens."""
        swift_files = []
        for root, _, files in os.walk(DARS_IOS_DIR):
            for f in files:
                if f.endswith(".swift"):
                    swift_files.append(os.path.join(root, f))

        self.assertGreaterEqual(len(swift_files), 32, f"Expected at least 32 Swift files, found {len(swift_files)}")

        for path in swift_files:
            rel = os.path.relpath(path, REPO_ROOT)
            with open(path, "r", encoding="utf-8") as f:
                raw_code = f.read()
            clean_code = strip_swift_comments_and_strings(raw_code)

            open_brace = clean_code.count("{")
            close_brace = clean_code.count("}")
            self.assertEqual(
                open_brace, close_brace,
                f"Mismatched braces in {rel}: {open_brace} open != {close_brace} close"
            )

            open_paren = clean_code.count("(")
            close_paren = clean_code.count(")")
            self.assertEqual(
                open_paren, close_paren,
                f"Mismatched parens in {rel}: {open_paren} open != {close_paren} close"
            )

            open_bracket = clean_code.count("[")
            close_bracket = clean_code.count("]")
            self.assertEqual(
                open_bracket, close_bracket,
                f"Mismatched brackets in {rel}: {open_bracket} open != {close_bracket} close"
            )

    # ----------------------------------------------------------------------
    # GROUP 8: Cross-Platform E2E Verification Runner Execution
    # ----------------------------------------------------------------------
    def test_group8_execute_e2e_runner(self):
        """Execute Tests/runner/run_all_tests.py and assert 100% pass across all 74 tests."""
        runner_path = os.path.join(REPO_ROOT, "Tests", "runner", "run_all_tests.py")
        self.assertTrue(os.path.isfile(runner_path), "run_all_tests.py missing")

        cmd = [sys.executable, runner_path]
        res = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
        self.assertEqual(
            res.returncode, 0,
            f"E2E Runner failed with code {res.returncode}:\n{res.stdout}\n{res.stderr}"
        )
        self.assertIn("Ran 74 tests", res.stderr + res.stdout)
        self.assertIn("Final Status: SUCCESS (100% PASS)", res.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
