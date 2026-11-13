import importlib.util
from pathlib import Path
import unittest
from cryptography.fernet import InvalidToken

spec = importlib.util.spec_from_file_location('backup_d1', Path(__file__).resolve().parents[1] / 'tools/backup-d1.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)
SCHEMA = (Path(__file__).resolve().parents[1] / 'database/schema.sql').read_bytes()

class D1BackupTests(unittest.TestCase):
    def test_private_fields_and_reply_restore_only_in_memory(self):
        sql = SCHEMA + b"\nINSERT INTO bbs_posts(id,parent_id,name,message,ip_hash) VALUES (1,NULL,'fixture','root','private-fixture');\nINSERT INTO bbs_posts(id,parent_id,name,message,ip_hash) VALUES (2,1,'fixture','reply','private-fixture');"
        verified = backup.validate_sql(sql)
        self.assertEqual(verified['posts'], 1)
        self.assertEqual(verified['replies'], 1)
        self.assertTrue(verified['expected_indexes_present'])

    def test_ciphertext_roundtrip_and_wrong_key(self):
        plaintext = b'private test fixture, not real data'
        secret = 'a' * 40
        ciphertext = backup.seal(plaintext, secret)
        self.assertNotIn(plaintext, ciphertext)
        self.assertEqual(backup.unseal(ciphertext, secret), plaintext)
        with self.assertRaises(InvalidToken):
            backup.unseal(ciphertext, 'b' * 40)

    def test_orphan_and_filesystem_sql_are_rejected(self):
        with self.assertRaises(ValueError):
            backup.validate_sql(SCHEMA + b"\nINSERT INTO bbs_posts(id,parent_id,name,message,ip_hash) VALUES (1,999,'fixture','reply','fixture');")
        with self.assertRaises(Exception):
            backup.validate_sql(b"ATTACH DATABASE '/tmp/should-not-be-written.sqlite' AS other;")

    def test_missing_schema_is_not_a_complete_backup(self):
        with self.assertRaises(ValueError):
            backup.validate_sql(b'CREATE TABLE unrelated(id INTEGER);')

if __name__ == '__main__':
    unittest.main()
