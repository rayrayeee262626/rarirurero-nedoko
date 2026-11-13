import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('release', Path(__file__).resolve().parents[1] / 'tools/deploy-production.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class ReleaseTests(unittest.TestCase):
    def project(self):
        return {'name': release.connect.PROJECT, 'subdomain': release.connect.PROJECT + '.pages.dev',
                'production_branch': 'main', 'canonical_deployment': {'id': '12345678-1234-1234-1234-123456789abc'},
                'deployment_configs': {'production': {'env_vars': {'TURNSTILE_SITE_KEY': {'value': 'fixture-public'}, 'TURNSTILE_SECRET': {'value': 'fixture-secret'}}}}}

    def test_production_identity_and_rollback_target_required(self):
        self.assertEqual(release.check_project(self.project())[0], 'main')
        project = self.project()
        project['name'] += '-preview'
        with self.assertRaises(release.connect.ConnectionFailure):
            release.check_project(project)

    def test_missing_turnstile_is_not_silently_deployed(self):
        project = self.project()
        del project['deployment_configs']['production']['env_vars']['TURNSTILE_SECRET']
        with self.assertRaises(release.connect.ConnectionFailure):
            release.check_project(project)

    def test_settings_fingerprint_detects_value_change_without_logging_value(self):
        project = self.project()
        before = release.fingerprint(project)
        project['deployment_configs']['production']['env_vars']['TURNSTILE_SECRET']['value'] = 'different-fixture'
        self.assertNotEqual(before, release.fingerprint(project))

    def test_exact_approved_production_output(self):
        files = release.approved_files()
        self.assertEqual(len(files), 13)
        self.assertIn('_worker.js', files)

if __name__ == '__main__':
    unittest.main()
