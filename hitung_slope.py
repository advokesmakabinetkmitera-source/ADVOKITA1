import arcpy
import os

def main():
    try:
        # Mengakses project ArcGIS Pro yang sedang aktif
        aprx = arcpy.mp.ArcGISProject("CURRENT")
        active_map = aprx.activeMap
        if not active_map:
            arcpy.AddError("Tidak ada peta (map) yang aktif di ArcGIS Pro.")
            return

        layer_name = "DEMINAGEOPORTALBLOK_Resample"
        target_layer = None
        for lyr in active_map.listLayers():
            if lyr.name.lower() == layer_name.lower():
                target_layer = lyr
                break

        if not target_layer:
            arcpy.AddError(f"Layer '{layer_name}' tidak ditemukan di peta aktif. Pastikan layer tersebut sudah ada di panel Contents.")
            return

        dem_source = target_layer.dataSource
        arcpy.AddMessage(f"DEM ditemukan dari source: {dem_source}")

        # Tentukan lokasi output slope di Default Geodatabase project
        gdb = aprx.defaultGeodatabase
        out_slope_name = "Slope_DEMINAGEOPORTALBLOK"
        out_slope_path = os.path.join(gdb, out_slope_name)

        # Jika raster sudah ada di GDB, hapus dulu agar tidak error overwrite
        if arcpy.Exists(out_slope_path):
            arcpy.management.Delete(out_slope_path)

        arcpy.AddMessage("Menghitung kemiringan (Slope)...")
        # Menjalankan tool Slope (Output dalam derajat / DEGREE)
        arcpy.ddd.Slope(dem_source, out_slope_path, "DEGREE", 1)

        if arcpy.Exists(out_slope_path):
            arcpy.AddMessage(f"Slope berhasil dihitung dan disimpan di: {out_slope_path}")
            
            # Tambahkan raster slope baru ke peta aktif
            new_layer = active_map.addDataFromPath(out_slope_path)
            arcpy.AddMessage("Layer slope berhasil ditambahkan ke peta.")

            # Mengatur simbolisasi (Klasifikasi 5 kelas dengan skema warna Hijau ke Merah)
            try:
                sym = new_layer.symbology
                if hasattr(sym, 'rendererType'):
                    sym.rendererType = 'RasterClassifyRenderer'
                    sym.classificationMethod = 'NaturalBreaks'
                    sym.classCount = 5
                    
                    # Mencari color ramp Green-Yellow-Red atau Spectral
                    ramps = arcpy.mp.ListColorRamps("Green-Yellow-Red")
                    if not ramps:
                        ramps = arcpy.mp.ListColorRamps("Spectral")
                    
                    if ramps:
                        sym.colorRamp = ramps[0]
                        arcpy.AddMessage(f"Menggunakan color ramp: {ramps[0].name}")
                    
                    new_layer.symbology = sym
                    arcpy.AddMessage("Simbolisasi 5 kelas (Hijau ke Merah) berhasil diterapkan.")
            except Exception as sym_err:
                arcpy.AddMessage(f"Catatan simbolisasi: {str(sym_err)}. Anda dapat mengatur simbolisasi manual melalui panel Symbology jika diperlukan.")
        else:
            arcpy.AddError("Gagal menghasilkan raster slope.")

    except Exception as e:
        arcpy.AddError(f"Terjadi kesalahan: {str(e)}")

if __name__ == '__main__':
    main()
