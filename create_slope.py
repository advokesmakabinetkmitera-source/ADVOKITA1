import arcpy

arcpy.env.workspace = r"D:\DataGIS"

dem_path = r"D:\DataGIS\DEM.tif"
slope_path = r"D:\DataGIS\Slope_Peta.tif"

if not arcpy.Exists(dem_path):
    arcpy.management.CreateRandomRaster(
        out_path=r"D:\DataGIS",
        out_name="DEM.tif",
        distribution="UNIFORM 0 5000",
        raster_extent="-1000000 -1000000 1000000 1000000",
        cellsize=100
    )
    arcpy.AddMessage(f"Created DEM at {dem_path}")

arcpy.ddd.Slope(dem_path, slope_path, "DEGREE", 1)

if arcpy.Exists(slope_path):
    arcpy.AddMessage(f"SUCCESS: Slope map saved to {slope_path}")
else:
    arcpy.AddMessage("ERROR: Slope map was not created.")
