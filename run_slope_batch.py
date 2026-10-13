import arcpy
import os

aprx_paths = [
    r"C:\Users\ASUS\OneDrive - Institut Teknologi Sumatera\Documents\ArcGIS\Projects\kp\kp.aprx",
    r"C:\Users\ASUS\OneDrive - Institut Teknologi Sumatera\Documents\ArcGIS\Projects\kp kalbar\kp kalbar.aprx",
    r"C:\Users\ASUS\OneDrive - Institut Teknologi Sumatera\Documents\ArcGIS\Projects\MyProject\MyProject.aprx",
    r"C:\Users\ASUS\OneDrive - Institut Teknologi Sumatera\Documents\ArcGIS\Projects\MyProject1\MyProject1.aprx",
    r"C:\Users\ASUS\OneDrive - Institut Teknologi Sumatera\Documents\ArcGIS\Projects\MyProject2\MyProject2.aprx"
]

target_layer_name = "DEMINAGEOPORTALBLOK_Resample"
found = False

for aprx_path in aprx_paths:
    if not os.path.exists(aprx_path):
        continue
    print(f"Memeriksa project: {aprx_path}")
    try:
        aprx = arcpy.mp.ArcGISProject(aprx_path)
        for map_obj in aprx.listMaps():
            for lyr in map_obj.listLayers():
                if lyr.name.lower() == target_layer_name.lower():
                    print(f"Ditemukan layer '{target_layer_name}' di project {aprx_path} (Map: {map_obj.name})")
                    dem_source = lyr.dataSource
                    print(f"Source DEM: {dem_source}")

                    gdb = aprx.defaultGeodatabase
                    out_slope_name = "Slope_DEMINAGEOPORTALBLOK"
                    out_slope_path = os.path.join(gdb, out_slope_name)

                    if arcpy.Exists(out_slope_path):
                        arcpy.management.Delete(out_slope_path)

                    print("Menghitung slope...")
                    arcpy.ddd.Slope(dem_source, out_slope_path, "DEGREE", 1)

                    if arcpy.Exists(out_slope_path):
                        print(f"Slope berhasil dibuat di: {out_slope_path}")
                        new_layer = map_obj.addDataFromPath(out_slope_path)
                        
                        try:
                            sym = new_layer.symbology
                            if hasattr(sym, 'rendererType'):
                                sym.rendererType = 'RasterClassifyRenderer'
                                sym.classificationMethod = 'NaturalBreaks'
                                sym.classCount = 5
                                ramps = arcpy.mp.ListColorRamps("Green-Yellow-Red")
                                if not ramps:
                                    ramps = arcpy.mp.ListColorRamps("Spectral")
                                if ramps:
                                    sym.colorRamp = ramps[0]
                                new_layer.symbology = sym
                                print(f"Simbolisasi berhasil diterapkan menggunakan {ramps[0].name if ramps else 'default'}")
                        except Exception as e:
                            print(f"Catatan simbolisasi: {e}")

                        aprx.save()
                        print(f"Project berhasil disimpan: {aprx_path}")
                        found = True
                        break
            if found:
                break
        if found:
            break
    except Exception as e:
        print(f"Error pada project {aprx_path}: {e}")

if not found:
    print(f"Layer '{target_layer_name}' tidak ditemukan di semua project .aprx yang diperiksa.")
