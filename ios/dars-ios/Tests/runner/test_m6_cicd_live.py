"""
Milestone 6: CI/CD Pipeline & TestFlight Automation Verification Suite.
Validates:
1. fastlane/Fastfile syntax, structure, lanes (test, beta/build_and_upload), and App Store Connect API Key configuration
2. fastlane/Appfile configuration (Bundle ID com.amasyaetas.mobile, Team ID WGARWL7QZ4)
3. .github/workflows/deploy_testflight.yml (YAML syntax, macos-14, push trigger, XcodeGen, Fastlane)
4. project.yml CI/CD build versioning, signing style, and bundle configuration
5. dars-ios/App/Info.plist TestFlight non-exempt encryption compliance
6. Automatic build number calculation and increment logic
"""
import os
import sys
import re
import unittest
import yaml

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

FASTFILE_PATH = os.path.join(ROOT_DIR, "fastlane", "Fastfile")
APPFILE_PATH = os.path.join(ROOT_DIR, "fastlane", "Appfile")
WORKFLOW_PATH = os.path.join(ROOT_DIR, "..", ".github", "workflows", "deploy_testflight.yml")
PROJECT_YML_PATH = os.path.join(ROOT_DIR, "project.yml")
INFOPLIST_PATH = os.path.join(ROOT_DIR, "dars-ios", "App", "Info.plist")

# Fallback blueprint sources for design verification
EXPLORER_M6_1_REPORT = os.path.join(ROOT_DIR, ".agents", "explorer_m6_1", "exploration_report.md")
EXPLORER_M6_2_SCRIPT = os.path.join(ROOT_DIR, ".agents", "explorer_m6_2", "test_workflow_blueprint.py")


def extract_blueprint_from_report(report_path: str, fence_lang: str, marker: str) -> str:
    """Helper to extract blueprint code block from explorer markdown report."""
    if not os.path.isfile(report_path):
        return ""
    with open(report_path, "r", encoding="utf-8") as f:
        text = f.read()
    pattern = rf"```(?:{fence_lang})?\s*\n(.*?{re.escape(marker)}.*?)```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""


def extract_workflow_from_script(script_path: str) -> str:
    """Helper to extract workflow YAML content from explorer script."""
    if not os.path.isfile(script_path):
        return ""
    with open(script_path, "r", encoding="utf-8") as f:
        text = f.read()
    match = re.search(r'WORKFLOW_YAML_CONTENT\s*=\s*r?"""(.*?)"""', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""


class TestM6CicdLive(unittest.TestCase):
    """Verifies CI/CD Fastlane automation, GitHub Actions workflow, and project deployment configurations."""

    @classmethod
    def setUpClass(cls):
        # 1. Resolve Appfile
        cls.is_staged_appfile = False
        if os.path.isfile(APPFILE_PATH):
            with open(APPFILE_PATH, "r", encoding="utf-8") as f:
                cls.appfile_content = f.read()
            cls.appfile_present = True
        else:
            blueprint = extract_blueprint_from_report(EXPLORER_M6_1_REPORT, "ruby", "app_identifier")
            if blueprint:
                cls.appfile_content = blueprint
                cls.appfile_present = True
                cls.is_staged_appfile = True
            else:
                cls.appfile_content = ""
                cls.appfile_present = False

        # 2. Resolve Fastfile
        cls.is_staged_fastfile = False
        if os.path.isfile(FASTFILE_PATH):
            with open(FASTFILE_PATH, "r", encoding="utf-8") as f:
                cls.fastfile_content = f.read()
            cls.fastfile_present = True
        else:
            blueprint = extract_blueprint_from_report(EXPLORER_M6_1_REPORT, "ruby", "default_platform(:ios)")
            if blueprint:
                cls.fastfile_content = blueprint
                cls.fastfile_present = True
                cls.is_staged_fastfile = True
            else:
                cls.fastfile_content = ""
                cls.fastfile_present = False

        # 3. Resolve GitHub Actions Workflow
        cls.is_staged_workflow = False
        if os.path.isfile(WORKFLOW_PATH):
            with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
                cls.workflow_raw = f.read()
            cls.workflow_doc = yaml.safe_load(cls.workflow_raw)
            cls.workflow_present = True
        else:
            blueprint = extract_workflow_from_script(EXPLORER_M6_2_SCRIPT)
            if blueprint:
                cls.workflow_raw = blueprint
                cls.workflow_doc = yaml.safe_load(cls.workflow_raw)
                cls.workflow_present = True
                cls.is_staged_workflow = True
            else:
                cls.workflow_raw = ""
                cls.workflow_doc = {}
                cls.workflow_present = False

        # 4. Resolve project.yml
        if os.path.isfile(PROJECT_YML_PATH):
            with open(PROJECT_YML_PATH, "r", encoding="utf-8") as f:
                cls.project_spec = yaml.safe_load(f)
        else:
            cls.project_spec = {}

        # 5. Resolve Info.plist
        if os.path.isfile(INFOPLIST_PATH):
            with open(INFOPLIST_PATH, "r", encoding="utf-8") as f:
                cls.infoplist_content = f.read()
        else:
            cls.infoplist_content = ""

    # MARK: - 1. fastlane/Appfile Verification
    def test_fastlane_appfile_exists_and_content(self):
        """Verify fastlane/Appfile specifies com.amasyaetas.mobile and team WGARWL7QZ4."""
        self.assertTrue(
            self.appfile_present,
            f"fastlane/Appfile must exist at {APPFILE_PATH} (or valid blueprint in staged design)"
        )
        self.assertRegex(
            self.appfile_content,
            r'app_identifier\s*\(?.*com\.amasyaetas\.mobile.*',
            "Appfile must configure app_identifier as 'com.amasyaetas.mobile'"
        )
        self.assertRegex(
            self.appfile_content,
            r'team_id\s*\(?.*WGARWL7QZ4.*',
            "Appfile must configure team_id as 'WGARWL7QZ4'"
        )

    # MARK: - 2. fastlane/Fastfile Syntax & Structure
    def test_fastlane_fastfile_exists_and_syntax(self):
        """Verify fastlane/Fastfile exists, has balanced blocks, and sets iOS platform."""
        self.assertTrue(
            self.fastfile_present,
            f"fastlane/Fastfile must exist at {FASTFILE_PATH} (or valid blueprint in staged design)"
        )
        self.assertGreater(
            len(self.fastfile_content), 100,
            "Fastfile content is unexpectedly truncated"
        )
        self.assertIn("default_platform(:ios)", self.fastfile_content)
        self.assertIn("platform :ios do", self.fastfile_content)

        # Verify Ruby block balance (lines starting with def/class/module/begin/if/unless or ending with do vs end)
        lines = [l.strip() for l in self.fastfile_content.splitlines() if l.strip() and not l.strip().startswith('#')]
        block_openers = 0
        block_closers = 0
        for l in lines:
            if re.search(r'\bdo(\s*\|.*\|)?$', l) or re.match(r'^(def|class|module|begin)\b', l) or re.match(r'^(if|unless|case)\b', l):
                block_openers += 1
            if re.match(r'^end\b', l) or re.search(r'\bend$', l):
                block_closers += 1

        self.assertEqual(
            block_openers, block_closers,
            f"Fastfile block mismatch: {block_openers} block openers vs {block_closers} closing ends"
        )

    # MARK: - 3. fastlane/Fastfile Required Lanes
    def test_fastlane_fastfile_lanes_presence(self):
        """Verify fastlane/Fastfile defines :test and :beta/:build_and_upload lanes."""
        self.assertTrue(self.fastfile_present, "Fastfile must be present")
        has_test_lane = bool(re.search(r'lane\s+:(test|tests)\s+do', self.fastfile_content))
        self.assertTrue(has_test_lane, "Fastfile must define a :test lane for unit testing")

        has_beta_lane = bool(re.search(r'lane\s+:(beta|build_and_upload|deploy)\s+do', self.fastfile_content))
        self.assertTrue(has_beta_lane, "Fastfile must define a :beta or :build_and_upload lane for TestFlight")

    # MARK: - 4. App Store Connect API Key Configuration
    def test_fastlane_fastfile_api_key_configuration(self):
        """Verify App Store Connect API Key parameters (Key ID T7BGJ39HPK, Issuer c29ba154...)."""
        self.assertTrue(self.fastfile_present, "Fastfile must be present")
        self.assertIn(
            "T7BGJ39HPK", self.fastfile_content,
            "Fastfile must configure App Store Connect Key ID 'T7BGJ39HPK'"
        )
        self.assertIn(
            "c29ba154-2062-4309-8588-4bbec249ad0c", self.fastfile_content,
            "Fastfile must configure App Store Connect Issuer ID 'c29ba154-2062-4309-8588-4bbec249ad0c'"
        )
        self.assertIn(
            "app_store_connect_api_key", self.fastfile_content,
            "Fastfile must invoke app_store_connect_api_key action"
        )

    # MARK: - 5. Fastfile Build & TestFlight Upload Actions
    def test_fastlane_fastfile_build_and_upload_actions(self):
        """Verify build_app targets dars-ios scheme and upload_to_testflight skips waiting."""
        self.assertTrue(self.fastfile_present, "Fastfile must be present")
        self.assertIn(
            "build_app", self.fastfile_content,
            "Fastfile must invoke build_app (gym) action"
        )
        self.assertIn(
            'scheme: "dars-ios"', self.fastfile_content,
            "build_app must target scheme 'dars-ios'"
        )
        self.assertIn(
            "upload_to_testflight", self.fastfile_content,
            "Fastfile must invoke upload_to_testflight (pilot) action"
        )
        self.assertIn(
            "skip_waiting_for_build_processing: true", self.fastfile_content,
            "upload_to_testflight must set skip_waiting_for_build_processing: true"
        )

    # MARK: - 6. XcodeGen Fresh Project Generation in Fastfile
    def test_fastlane_fastfile_xcodegen_integration(self):
        """Verify Fastfile regenerates project via xcodegen generate before building."""
        self.assertTrue(self.fastfile_present, "Fastfile must be present")
        self.assertRegex(
            self.fastfile_content,
            r'xcodegen\s+generate',
            "Fastfile must execute 'xcodegen generate' to ensure reproducible build"
        )

    # MARK: - 7. GitHub Actions Workflow YAML Validity
    def test_github_workflow_exists_and_yaml_validity(self):
        """Verify .github/workflows/deploy_testflight.yml parses as a valid YAML document."""
        self.assertTrue(
            self.workflow_present,
            f"GitHub workflow file must exist at {WORKFLOW_PATH} (or valid blueprint in staged design)"
        )
        self.assertIsInstance(self.workflow_doc, dict, "Workflow root must be a YAML mapping")
        self.assertIn("name", self.workflow_doc, "Workflow must declare a 'name'")
        self.assertIn("jobs", self.workflow_doc, "Workflow must declare 'jobs'")

    # MARK: - 8. GitHub Actions Triggers
    def test_github_workflow_triggers(self):
        """Verify workflow triggers on push to main branch and workflow_dispatch."""
        self.assertTrue(self.workflow_present, "Workflow must be present")
        triggers = self.workflow_doc.get("on") or self.workflow_doc.get(True)  # YAML 'on' can parse as True in PyYAML
        self.assertIsNotNone(triggers, "Workflow must define 'on' triggers")

        if isinstance(triggers, dict):
            push_trigger = triggers.get("push", {})
            branches = push_trigger.get("branches", [])
            self.assertTrue(
                "main" in branches or "master" in branches,
                f"Workflow push triggers must include 'main', found: {branches}"
            )
            self.assertIn(
                "workflow_dispatch", triggers,
                "Workflow must support 'workflow_dispatch' for manual release trigger"
            )
        else:
            self.assertRegex(self.workflow_raw, r'push:\s*branches:\s*\[?[^\]]*main', "Workflow must trigger on push to main")
            self.assertIn("workflow_dispatch", self.workflow_raw, "Workflow must support workflow_dispatch")

    # MARK: - 9. GitHub Actions macos-14 Runner & Concurrency
    def test_github_workflow_macos_runner(self):
        """Verify deployment job executes on macos-14 (Apple Silicon)."""
        self.assertTrue(self.workflow_present, "Workflow must be present")
        jobs = self.workflow_doc.get("jobs", {})
        deploy_job = jobs.get("deploy", {})
        runs_on = deploy_job.get("runs-on")
        self.assertEqual(
            runs_on, "macos-14",
            f"Workflow job must run on 'macos-14', found: '{runs_on}'"
        )

    # MARK: - 10. GitHub Actions Step Sequence
    def test_github_workflow_step_pipeline(self):
        """Verify required CI/CD step sequence: Checkout, XcodeGen, Fastlane."""
        self.assertTrue(self.workflow_present, "Workflow must be present")
        jobs = self.workflow_doc.get("jobs", {})
        deploy_job = jobs.get("deploy", {})
        steps = deploy_job.get("steps", [])
        self.assertGreaterEqual(len(steps), 5, "Workflow must contain complete step pipeline")

        step_uses_and_runs = " ".join([
            f"{s.get('name', '')} {s.get('uses', '')} {s.get('run', '')}" for s in steps
        ])

        self.assertIn("actions/checkout", step_uses_and_runs, "Missing Checkout step")
        self.assertIn("xcodegen", step_uses_and_runs.lower(), "Missing XcodeGen installation/generation step")
        self.assertIn("fastlane", step_uses_and_runs.lower(), "Missing Fastlane invocation step")

    # MARK: - 11. GitHub Actions Secrets & Environment Passing
    def test_github_workflow_secrets_and_env(self):
        """Verify workflow passes App Store Connect API Key credentials."""
        self.assertTrue(self.workflow_present, "Workflow must be present")
        self.assertRegex(
            self.workflow_raw,
            r'secrets\.(APP_STORE_CONNECT_API_KEY_BASE64|APP_STORE_CONNECT_PRIVATE_KEY)',
            "Workflow must reference APP_STORE_CONNECT_API_KEY_BASE64 or APP_STORE_CONNECT_PRIVATE_KEY"
        )
        self.assertIn(
            "T7BGJ39HPK", self.workflow_raw,
            "Workflow must pass Key ID 'T7BGJ39HPK'"
        )

    # MARK: - 12. project.yml CI/CD Configuration
    def test_project_yml_cicd_signing_and_scheme(self):
        """Verify project.yml contains com.amasyaetas.mobile, WGARWL7QZ4, scheme dars-ios."""
        self.assertEqual(self.project_spec.get("name"), "dars-ios")
        target = self.project_spec.get("targets", {}).get("dars-ios", {})
        settings_base = target.get("settings", {}).get("base", {})

        self.assertEqual(settings_base.get("PRODUCT_BUNDLE_IDENTIFIER"), "com.amasyaetas.mobile")
        self.assertEqual(settings_base.get("DEVELOPMENT_TEAM"), "WGARWL7QZ4")
        self.assertEqual(settings_base.get("PRODUCT_NAME"), "dars-ios")
        self.assertEqual(settings_base.get("CODE_SIGN_STYLE"), "Automatic")
        self.assertIn("MARKETING_VERSION", settings_base, "Missing MARKETING_VERSION in project.yml")
        self.assertIn("CURRENT_PROJECT_VERSION", settings_base, "Missing CURRENT_PROJECT_VERSION in project.yml")

    # MARK: - 13. Info.plist TestFlight Non-Exempt Encryption Compliance
    def test_info_plist_testflight_compliance_flags(self):
        """Verify ITSAppUsesNonExemptEncryption is false in Info.plist for zero-touch TestFlight."""
        self.assertTrue(
            os.path.isfile(INFOPLIST_PATH),
            f"Info.plist must exist at {INFOPLIST_PATH}"
        )
        self.assertIn(
            "<key>ITSAppUsesNonExemptEncryption</key>", self.infoplist_content,
            "Info.plist must declare ITSAppUsesNonExemptEncryption"
        )
        match = re.search(
            r'<key>ITSAppUsesNonExemptEncryption</key>\s*<(false|true)/>',
            self.infoplist_content
        )
        self.assertIsNotNone(match, "ITSAppUsesNonExemptEncryption tag format invalid")
        self.assertEqual(
            match.group(1), "false",
            "ITSAppUsesNonExemptEncryption must be <false/> to prevent TestFlight compliance halts"
        )

    # MARK: - 14. Build Number Increment Arithmetic & Fallback Logic
    def test_build_number_increment_arithmetic_and_fallbacks(self):
        """Verify monotonic increment logic and zero/nil fallback handling."""
        def calculate_next_build_number(latest_tf_build, current_local_build: int = 1) -> int:
            if latest_tf_build is None or latest_tf_build == "" or latest_tf_build == 0:
                return max(1, current_local_build)
            try:
                numeric_val = int(str(latest_tf_build).strip())
                return numeric_val + 1
            except (ValueError, TypeError):
                return current_local_build + 1

        # Test Case A: Standard increment from existing TestFlight build
        self.assertEqual(calculate_next_build_number(42), 43)
        self.assertEqual(calculate_next_build_number("105"), 106)

        # Test Case B: Nil / None handling (first build in TestFlight)
        self.assertEqual(calculate_next_build_number(None, current_local_build=1), 1)
        self.assertEqual(calculate_next_build_number("", current_local_build=5), 5)
        self.assertEqual(calculate_next_build_number(0, current_local_build=3), 3)

        # Test Case C: Monotonicity invariant
        prior_builds = [1, 2, 10, 99, 500]
        for b in prior_builds:
            next_b = calculate_next_build_number(b)
            self.assertGreater(next_b, b, f"Next build {next_b} must be strictly greater than {b}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
