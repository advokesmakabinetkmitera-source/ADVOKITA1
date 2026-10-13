import arcpy
import os
import numpy as np

arcpy.env.workspace = r"D:\DataGIS"

dem_path = r"D:\DataGIS\DEM.tif"

if not arcpy.Exists(dem_path):
    desc = arcpy.Describe(r"D:\DataGIS")
    sr = arcpy.SpatialReference(4326)
    arcpy.management.CreateNetCDFRaster(
        dem_path, "DEM", sr, 100, 100, -100, 100, 10, 10
    )

arcpy.AddMessage(f"DEM ready: {dem_path}")
