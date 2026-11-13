import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('connect', Path(__file__).resolve().parents[1] / 'tools/cloudflare-connect.py')
connect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(connect)

class ConnectionTests(unittest.TestCase):
    account_id = 'a' * 32
    database_id = '12345678-1234-1234-1234-123456789abc'

    def responses(self):
        return [{'status': 'active'}, [{'id': self.account_id}], {
            'name': connect.PROJECT, 'subdomain': connect.PROJECT + '.pages.dev',
            'deployment_configs': {'production': {
                'd1_databases': {'DB': {'id': self.database_id}},
                'env_vars': {'TEST_SECRET': {'value': 'fixture-secret-never-returned'}},
            }}, 'source': None,
        }, {'uuid': self.database_id}]

    def test_binding_is_source_of_target_and_secrets_are_not_returned(self):
        with patch.object(connect, 'api_get', side_effect=self.responses()) as api:
            target = connect.discover('test-token')
        self.assertEqual(target['database_id'], self.database_id)
        self.assertNotIn('secret', str(target))
        self.assertNotIn('test-token', str(target))
        self.assertTrue(api.call_args_list[-1].args[0].endswith(self.database_id))

    def test_missing_binding_fails_closed(self):
        values = self.responses()
        values[2]['deployment_configs']['production']['d1_databases'] = {}
        with patch.object(connect, 'api_get', side_effect=values):
            with self.assertRaises(connect.ConnectionFailure):
                connect.discover('test-token')

    def test_inactive_token_is_not_used(self):
        with patch.object(connect, 'api_get', return_value={'status': 'expired'}) as api:
            with self.assertRaises(connect.ConnectionFailure):
                connect.discover('test-token')
        self.assertEqual(api.call_count, 1)

    def test_selected_account_does_not_require_account_listing_permission(self):
        values = self.responses()
        del values[1]
        with patch.object(connect, 'api_get', side_effect=values) as api:
            target = connect.discover('test-token', self.account_id)
        self.assertEqual(target['account_id'], self.account_id)
        self.assertFalse(any(call.args[0].startswith('/accounts?') for call in api.call_args_list))

if __name__ == '__main__':
    unittest.main()
