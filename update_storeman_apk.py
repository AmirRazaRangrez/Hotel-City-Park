import zipfile
import subprocess
import os
import shutil

apk_path = r"c:\Aamir Delta\city_backup\Storeman.apk"
html_src = r"c:\Aamir Delta\city_backup\store_index.html"

if not os.path.exists(apk_path):
    raise FileNotFoundError("Storeman.apk not found at " + apk_path)
if not os.path.exists(html_src):
    raise FileNotFoundError("store_index.html not found at " + html_src)

temp_apk = r"c:\Aamir Delta\city_backup\temp_storeman.apk"
aligned_apk = r"c:\Aamir Delta\city_backup\Storeman_aligned_final.apk"

build_tools = r"C:\Users\91937\AppData\Local\Android\Sdk\build-tools\37.0.0"
zipalign = os.path.join(build_tools, "zipalign.exe")
apksigner = os.path.join(build_tools, "apksigner.bat")
keystore = r"C:\Users\91937\.android\debug.keystore"

print("Updating assets/flutter_assets/assets/store/index.html inside Storeman.apk...")
with open(html_src, 'rb') as f:
    new_html_content = f.read()

with zipfile.ZipFile(apk_path, 'r') as zin:
    with zipfile.ZipFile(temp_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            # Skip old store html and signatures
            if item.filename == "assets/flutter_assets/assets/store/index.html":
                continue
            if item.filename.startswith("META-INF/"):
                continue
            buffer = zin.read(item.filename)
            zout.writestr(item, buffer)
        
        # Write updated store HTML
        zout.writestr("assets/flutter_assets/assets/store/index.html", new_html_content)

print("Running zipalign...")
if os.path.exists(aligned_apk):
    os.remove(aligned_apk)
subprocess.check_call([zipalign, "-p", "-f", "4", temp_apk, aligned_apk])

print("Signing with debug keystore...")
subprocess.check_call([
    apksigner, "sign",
    "--ks", keystore,
    "--ks-pass", "pass:android",
    "--ks-key-alias", "androiddebugkey",
    "--key-pass", "pass:android",
    aligned_apk
])

print("Verifying signature...")
subprocess.check_call([apksigner, "verify", "--verbose", aligned_apk])

# Replace master Storeman.apk
os.replace(aligned_apk, apk_path)

targets = [
    r"c:\Aamir Delta\city_backup\public\Storeman.apk",
    r"c:\Aamir Delta\city_backup\dist\Storeman.apk",
    r"c:\Aamir Delta\city_backup\release\public\Storeman.apk",
    r"c:\Aamir Delta\city_backup\release\dist\Storeman.apk",
    r"c:\Aamir Delta\city_backup\release-electron\Hotel City Park CRM-win32-x64\resources\app\public\Storeman.apk",
    r"c:\Aamir Delta\city_backup\release-electron\Hotel City Park CRM-win32-x64\resources\app\dist\Storeman.apk",
    r"c:\Aamir Delta\city_backup\apks\HotelCityPark-Storeman.apk"
]

for t in targets:
    try:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        shutil.copyfile(apk_path, t)
        print("Copied to:", t)
    except Exception as e:
        print("Warning copying to", t, e)

if os.path.exists(temp_apk):
    os.remove(temp_apk)

print("SUCCESS: Storeman.apk updated with latest Firebase store panel, signed, and deployed!")
