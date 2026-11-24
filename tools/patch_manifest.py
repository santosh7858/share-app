"""AndroidManifest.xml me permissions + foreground service add karta hai.
Usage: python tools/patch_manifest.py android/app/src/main/AndroidManifest.xml
"""
import sys

path = sys.argv[1]
s = open(path, encoding="utf-8").read()

PERMS = [
    "INTERNET",
    "POST_NOTIFICATIONS",
    "VIBRATE",
    "WAKE_LOCK",
    "FOREGROUND_SERVICE",
    "FOREGROUND_SERVICE_SPECIAL_USE",
    "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
]

SERVICE = (
    '        <service android:name="com.securechat.app.KeepAliveService" '
    'android:exported="false" android:foregroundServiceType="specialUse">\n'
    '            <property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE" '
    'android:value="Keeps the encrypted chat connection open to deliver message notifications"/>\n'
    '        </service>\n'
)

assert "<application" in s and "</application>" in s, "manifest me <application> nahi mila"

# permissions <application> se pehle
add = "".join(
    '    <uses-permission android:name="android.permission.%s"/>\n' % p
    for p in PERMS
    if 'android.permission.%s"' % p not in s
)
i = s.index("<application")
line_start = s.rfind("\n", 0, i) + 1
s = s[:line_start] + add + s[line_start:]

# service </application> se pehle
if "KeepAliveService" not in s:
    j = s.index("</application>")
    line_start = s.rfind("\n", 0, j) + 1
    s = s[:line_start] + SERVICE + s[line_start:]

open(path, "w", encoding="utf-8").write(s)
print("Manifest patched")
