import unittest
from unittest.mock import patch
import mac_status_server as status

class MacStatusTests(unittest.TestCase):
    def test_video_workers_not_playback_or_audio(self):
        self.assertTrue(status.is_video_render('node scripts/render-remotion.mjs --channel historia'))
        self.assertTrue(status.is_video_render('/usr/bin/ffmpeg -i input.wav -c:v libx264 output.mp4'))
        self.assertFalse(status.is_video_render('node remotion studio entry.tsx'))
        self.assertFalse(status.is_video_render('ffmpeg -i input.mp4 -f null -'))
        self.assertFalse(status.is_video_render('ffmpeg -i input.mp4 -vn -c:a pcm_s16le output.wav'))
        self.assertFalse(status.is_video_render('python3 -c "render-remotion.mjs"'))

    def test_status_never_returns_commands_or_paths(self):
        result = type('Result', (), {'returncode': 0, 'stdout': 'node scripts/render-remotion.mjs --secret sensitive\n'})()
        with patch.object(status.subprocess, 'run', return_value=result):
            data = status.mac_status([])
        self.assertTrue(data['rendering'])
        self.assertNotIn('sensitive', str(data))
        self.assertEqual(set(data), {'storage', 'rendering', 'producing'})

    def test_failed_inspection_is_not_idle(self):
        with patch.object(status.subprocess, 'run', side_effect=OSError):
            data = status.mac_status([])
        self.assertIsNone(data['rendering'])
