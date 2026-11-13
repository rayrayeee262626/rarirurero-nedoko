import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('backup', Path(__file__).resolve().parents[1] / 'tools/backup-bbs-public.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)

def root(i):
    return {'id': i, 'name': 'テスト', 'message': "改行\n引用'と<script>文字列</script>", 'created_at': '2026-11-13 00:00:00'}

class BackupTests(unittest.TestCase):
    def test_paginated_copy_and_lossless_restore(self):
        reply = {**root(11), 'parent_id': 10}
        pages = [{'posts': [root(10)], 'replies': [reply], 'nextBefore': 10}, {'posts': [root(2)], 'replies': [], 'nextBefore': None}]
        with patch.object(backup, 'fetch_page', side_effect=pages) as fetch:
            data = backup.collect()
        self.assertEqual(fetch.call_args_list[1].args, (10,))
        self.assertFalse(data['full_d1_backup'])
        self.assertFalse(data['atomic_snapshot'])
        self.assertEqual([r['id'] for r in data['posts']], [2, 10])
        backup.verify_into_memory(data)

    def test_cursor_must_advance(self):
        with patch.object(backup, 'fetch_page', return_value={'posts': [root(10)], 'replies': [], 'nextBefore': 20}):
            with self.assertRaises(ValueError):
                backup.collect()

    def test_orphan_reply_is_rejected(self):
        with patch.object(backup, 'fetch_page', return_value={'posts': [root(10)], 'replies': [{**root(12), 'parent_id': 9}], 'nextBefore': None}):
            with self.assertRaises(ValueError):
                backup.collect()

    def test_api_cap_is_marked_incomplete(self):
        replies = [{**root(i), 'parent_id': 1} for i in range(2, 202)]
        with patch.object(backup, 'fetch_page', return_value={'posts': [root(1)], 'replies': replies, 'nextBefore': None}):
            data = backup.collect()
        self.assertTrue(data['possible_reply_truncation'])

    def test_backup_cannot_be_saved_in_public_repo(self):
        with self.assertRaises(ValueError):
            backup.save(Path(__file__).resolve().parents[1] / 'backups')

    def test_failed_read_is_not_success(self):
        with patch.object(backup, 'fetch_page', side_effect=RuntimeError('offline fixture')):
            with self.assertRaises(RuntimeError):
                backup.collect()

if __name__ == '__main__':
    unittest.main()
