All the VC files in this folder and subfolder were generated from VC data held on iRecord which, in turn, are created from data curated by BRC for British VCs (https://github.com/BiologicalRecordsCentre/vice-counties) and another repository for Irish VCs (https://github.com/SK53/Irish-Vice-Counties). (The latter with a 3 nautical mile buffer added to make them comparable to the British VCs.)

- full - this folder contains separate geojson files holding the geometry of each VC with boundaries generalised using the https://mapshaper.org/ website with a Douglas-peucker reduction and a setting of 80%. This figure gave a significant reduction of file size without really compromising the resolution of the lines.

- 10 - this folder contains separate geojson files holding the geometry of each VC with boundaries generalised using the https://mapshaper.org/ website with a Douglas-peucker reduction and a setting of 25%.

- 100 - this folder contains separate geojson files holding the geometry of each VC with boundaries generalised using the https://mapshaper.org/ website with a Douglas-peucker reduction and a setting of 5%

- vcs-4326-1000 - this geojson file contains the geometry of all vice counties, with the boundaries generalised using the https://mapshaper.org/ website with a Douglas-peucker reduction and a setting of 2%.

- mbrs.csv - a file specifying the minimum bounding rectangle of each VC.

Note that teh folder names '10' and '100' and the figure '1000' in the file 'vcs-4326-1000' reflect a previous set of files generated using QGIS with a reduction tolerance of 10, 100 and 1000 m respectively. The names were kept here for backward compatibility.