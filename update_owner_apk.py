import zipfile
import subprocess
import os
import shutil

apk_path = r"c:\Aamir Delta\city_backup\public\HotelCityPark-Owner.apk"
bundle_src = r"c:\Aamir Delta\city_backup\temp_index.android.bundle"

if not os.path.exists(apk_path):
    raise FileNotFoundError("Base APK not found at " + apk_path)
if not os.path.exists(bundle_src):
    raise FileNotFoundError("temp_index.android.bundle not found at " + bundle_src)

temp_apk = r"c:\Aamir Delta\city_backup\temp_owner_unsigned.apk"
aligned_apk = r"c:\Aamir Delta\city_backup\HotelCityPark-Owner_aligned.apk"

build_tools = r"C:\Users\91937\AppData\Local\Android\Sdk\build-tools\35.0.0"
if not os.path.exists(build_tools):
    build_tools = r"C:\Users\91937\AppData\Local\Android\Sdk\build-tools\34.0.0"

zipalign = os.path.join(build_tools, "zipalign.exe")
apksigner = os.path.join(build_tools, "apksigner.bat")
keystore = r"C:\Users\91937\.android\debug.keystore"

print(f"Using build-tools at {build_tools}...")
print("Replacing assets/index.android.bundle inside HotelCityPark-Owner.apk...")

with open(bundle_src, 'rb') as f:
    new_bundle_bytes = f.read()

if os.path.exists(temp_apk):
    os.remove(temp_apk)

with zipfile.ZipFile(apk_path, 'r') as zin:
    with zipfile.ZipFile(temp_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            # Skip old bundle and old signatures
            if item.filename == "assets/index.android.bundle":
                continue
            if item.filename.startswith("META-INF/"):
                continue
            buffer = zin.read(item.filename)
            zout.writestr(item, buffer)
        
        # Write updated Hermes bundle
        zout.writestr("assets/index.android.bundle", new_bundle_bytes)

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
    aligned_apk
])

print("Verifying signature...")
subprocess.check_call([apksigner, "verify", aligned_apk])
print("Signature verified successfully!")

# Copy to destinations
destinations = [
    r"c:\Aamir Delta\city_backup\public\HotelCityPark-Owner.apk",
    r"c:\Aamir Delta\city_backup\public\HotelCityPark-Owner-v2.apk",
    r"c:\Aamir Delta\city_backup\public\HotelCityPark-Admin.apk",
    r"c:\Aamir Delta\city_backup\admin\HotelCityPark-Owner.apk",
]

for dest in destinations:
    shutil.copyfile(aligned_apk, dest)
    size_mb = os.path.getsize(dest) / (1024 * 1024)
    print(f"Updated {dest} ({size_mb:.2f} MB)")

if os.path.exists(r"c:\Aamir Delta\city_backup\apks"):
    for name in ["HotelCityPark-Owner.apk", "HotelCityPark-Admin.apk"]:
        dest = os.path.join(r"c:\Aamir Delta\city_backup\apks", name)
        shutil.copyfile(aligned_apk, dest)
        print(f"Updated {dest}")

# Cleanup temp files
if os.path.exists(temp_apk):
    os.remove(temp_apk)
if os.path.exists(aligned_apk):
    os.remove(aligned_apk)
if os.path.exists(bundle_src):
    os.remove(bundle_src)

print("\nOwner and Admin APKs successfully built and published!")
