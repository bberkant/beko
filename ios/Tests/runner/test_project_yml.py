"""
Milestone 1 Specification Verification: XcodeGen project.yml
Genuinely parses project.yml using PyYAML and verifies:
- Bundle ID 'com.amasyaetas.mobile'
- Deployment target iOS 17.0
- Target configurations ('dars-ios' and 'dars-iosTests')
- Swift Package Manager dependency 'supabase-swift' v2.5.0
- Source folder mappings and path existence on disk
"""
import os
import sys
import unittest
import yaml

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PROJECT_YML_PATH = os.path.join(ROOT_DIR, "project.yml")


class TestProjectYmlSpecification(unittest.TestCase):
    """Verifies that project.yml is syntactically valid and satisfies XcodeGen specs."""

    @classmethod
    def setUpClass(cls):
        if not os.path.isfile(PROJECT_YML_PATH):
            raise FileNotFoundError(f"project.yml not found at {PROJECT_YML_PATH}")
        with open(PROJECT_YML_PATH, "r", encoding="utf-8") as f:
            cls.spec = yaml.safe_load(f)

    def test_project_name_and_global_options(self):
        """Verify project name, bundleIdPrefix, and global deployment target."""
        self.assertEqual(self.spec.get("name"), "dars-ios")
        options = self.spec.get("options", {})
        self.assertEqual(options.get("bundleIdPrefix"), "com.amasyaetas")
        deployment_target = options.get("deploymentTarget", {})
        self.assertEqual(str(deployment_target.get("iOS")), "17.0")
        self.assertEqual(options.get("defaultConfig"), "Release")

    def test_spm_package_supabase_swift_declaration(self):
        """Verify SPM package dependency for supabase-swift v2.5.0."""
        packages = self.spec.get("packages", {})
        self.assertIn("supabase-swift", packages, "Package supabase-swift missing from packages")
        pkg_info = packages["supabase-swift"]
        self.assertEqual(pkg_info.get("url"), "https://github.com/supabase/supabase-swift.git")
        self.assertEqual(str(pkg_info.get("from")), "2.5.0")

    def test_targets_presence(self):
        """Verify targets dars-ios and dars-iosTests are defined."""
        targets = self.spec.get("targets", {})
        self.assertIn("dars-ios", targets, "Target dars-ios missing")
        self.assertIn("dars-iosTests", targets, "Target dars-iosTests missing")

    def test_target_dars_ios_configuration(self):
        """Verify application target architecture, bundle ID, team ID, and deployment target."""
        target = self.spec.get("targets", {}).get("dars-ios", {})
        self.assertEqual(target.get("type"), "application")
        self.assertEqual(target.get("platform"), "iOS")
        self.assertEqual(str(target.get("deploymentTarget")), "17.0")

        settings_base = target.get("settings", {}).get("base", {})
        self.assertEqual(settings_base.get("PRODUCT_BUNDLE_IDENTIFIER"), "com.amasyaetas.mobile")
        self.assertEqual(settings_base.get("DEVELOPMENT_TEAM"), "WGARWL7QZ4")
        self.assertEqual(settings_base.get("PRODUCT_NAME"), "dars-ios")
        self.assertEqual(settings_base.get("SWIFT_VERSION"), "5.9")

        # Verify Info.plist path and disk existence
        info_plist_rel = settings_base.get("INFOPLIST_FILE")
        self.assertEqual(info_plist_rel, "dars-ios/App/Info.plist")
        info_plist_full = os.path.join(ROOT_DIR, info_plist_rel)
        self.assertTrue(os.path.isfile(info_plist_full), f"Info.plist missing at {info_plist_full}")

        # Verify supabase dependency
        dependencies = target.get("dependencies", [])
        has_supabase = any(d.get("package") == "supabase-swift" and d.get("product") == "Supabase" for d in dependencies)
        self.assertTrue(has_supabase, "Target dars-ios must depend on supabase-swift product Supabase")

    def test_target_dars_ios_source_folder_mappings(self):
        """Verify dars-ios source mapping directory exists on disk with proper exclusion filters."""
        target = self.spec.get("targets", {}).get("dars-ios", {})
        sources = target.get("sources", [])
        self.assertGreater(len(sources), 0, "No sources defined for dars-ios target")

        dars_source = next((s for s in sources if s.get("path") == "dars-ios"), None)
        self.assertIsNotNone(dars_source, "dars-ios target must specify source path 'dars-ios'")

        dars_dir = os.path.join(ROOT_DIR, dars_source["path"])
        self.assertTrue(os.path.isdir(dars_dir), f"Source directory {dars_dir} does not exist on disk")

        excludes = dars_source.get("excludes", [])
        self.assertIn("Tests/**", excludes, "dars-ios sources must exclude Tests/** to prevent unit test leakage")
        self.assertIn("**/*.md", excludes, "dars-ios sources must exclude Markdown files")
        self.assertIn("**/*.html", excludes, "dars-ios sources must exclude HTML files")

    def test_target_dars_ios_tests_configuration_and_sources(self):
        """Verify test bundle architecture, target dependency, and test source directory on disk."""
        target = self.spec.get("targets", {}).get("dars-iosTests", {})
        self.assertEqual(target.get("type"), "bundle.unit-test")
        self.assertEqual(target.get("platform"), "iOS")
        self.assertEqual(str(target.get("deploymentTarget")), "17.0")

        settings_base = target.get("settings", {}).get("base", {})
        self.assertEqual(settings_base.get("PRODUCT_BUNDLE_IDENTIFIER"), "com.amasyaetas.mobileTests")
        self.assertEqual(settings_base.get("DEVELOPMENT_TEAM"), "WGARWL7QZ4")

        # Verify dependency on main target
        dependencies = target.get("dependencies", [])
        has_target_dep = any(d.get("target") == "dars-ios" for d in dependencies)
        self.assertTrue(has_target_dep, "dars-iosTests must depend on target dars-ios")

        # Verify test sources directory on disk
        sources = target.get("sources", [])
        self.assertGreater(len(sources), 0, "No sources defined for dars-iosTests target")
        test_source = next((s for s in sources if s.get("path") == "dars-ios/Tests"), None)
        self.assertIsNotNone(test_source, "dars-iosTests must specify source path 'dars-ios/Tests'")

        test_dir = os.path.join(ROOT_DIR, test_source["path"])
        self.assertTrue(os.path.isdir(test_dir), f"Test source directory {test_dir} does not exist on disk")


if __name__ == "__main__":
    unittest.main(verbosity=2)
