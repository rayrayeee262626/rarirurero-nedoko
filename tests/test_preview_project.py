import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('preview', Path(__file__).resolve().parents[1] / 'tools/prepare-preview-project.py')
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)

class PreviewProjectTests(unittest.TestCase):
    def project(self):
        return {'name': preview.PREVIEW, 'production_branch': 'preview', 'deployment_configs': {'production': {}, 'preview': {}}}

    def test_empty_separate_project_allowed(self):
        preview.check_isolation(self.project())

    def test_production_identity_rejected(self):
        project = self.project()
        project['name'] = 'rarirurero-nedoko'
        with self.assertRaises(preview.connect.ConnectionFailure):
            preview.check_isolation(project)

    def test_any_existing_db_binding_rejected(self):
        project = self.project()
        project['deployment_configs']['production']['d1_databases'] = {'DB': {'id': 'fixture'}}
        with self.assertRaises(preview.connect.ConnectionFailure):
            preview.check_isolation(project)

if __name__ == '__main__':
    unittest.main()
