# Geofence Configuration Guide

## Overview

This guide explains how to configure geofence zones for GPS-based location verification in the Attendance Management System.

## Understanding Geofences

A geofence is a virtual geographic boundary defined by:
- **Center Point**: Campus latitude and longitude
- **Radius**: Allowed distance in meters from center (typically 100-500m)

When a student scans a QR code, their GPS location is checked:
- ✅ **Inside geofence**: Attendance marked as PRESENT
- ❌ **Outside geofence**: Attendance rejected with location error

## GPS Accuracy Considerations

### Typical GPS Accuracy
- **Outdoor (clear sky)**: ±5-10 meters
- **Outdoor (partial coverage)**: ±15-30 meters
- **Indoor (near window)**: ±50-100 meters
- **Indoors (no signal)**: Unable to determine

### Recommended Radius Settings
- **Single Building**: 100-150 meters
- **City Block**: 150-250 meters
- **Multiple Buildings**: 250-400 meters
- **Large Campus**: 400-500 meters

## Finding Campus Coordinates

### Method 1: Google Maps
1. Open https://maps.google.com
2. Right-click on campus center
3. Click coordinates to copy
4. Format: `latitude, longitude`

**Example Output:** `40.206504, -111.891040`

### Method 2: GPS Coordinate Service
- Visit https://www.gps-coordinates.net
- Search for your university
- Note the coordinates

### Method 3: Phone GPS App
1. Open phone GPS/Maps app
2. Location = Precise coordinates shown

### Method 4: Admin Dashboard
1. Navigate to Admin Dashboard
2. Go to Geofence Zones
3. Use map picker (if available)
4. Click to select center point

## Configuration Steps

### Step 1: Access Admin Dashboard
```
1. Go to https://attendance.university.edu
2. Login as SUPER_ADMIN or DEPT_ADMIN
3. Navigate to "Geofence Zones" tab
```

### Step 2: Create Geofence Zone

**Fill in the form:**

| Field | Example | Notes |
|-------|---------|-------|
| Zone Name | "Main Campus" | Descriptive name |
| Latitude | 40.206504 | Campus center latitude |
| Longitude | -111.891040 | Campus center longitude |
| Radius (meters) | 200 | Distance from center |
| Building Name | "Engineering Building" | Optional - specific location |
| Description | "Main campus area..." | Optional - reference info |

**Submit:**
```
Click "Create Zone" button
```

### Step 3: Test Configuration

#### Manual Testing
1. Go to student scanner page
2. At campus center: should scan successfully
3. 300m away: should be rejected
4. Verify error message shows distance

#### GPS Testing Tool
```bash
# From command line
curl -X GET "http://localhost:5000/api/admin/geofence/zones"
```

## Multiple Geofence Zones

For multi-campus universities:

### Setup Process
1. Create separate zone for each campus
2. Each class session assigned to specific zone
3. Students scanned against assigned zone

### Example Configuration

```
Main Campus
├── Latitude: 40.2065
├── Longitude: -111.8910
└── Radius: 200m

North Building
├── Latitude: 40.2090
├── Longitude: -111.8920
└── Radius: 150m

South Campus
├── Latitude: 40.1950
├── Longitude: -111.8850
└── Radius: 250m
```

### Assign to Sessions
1. When creating class session
2. Select appropriate geofence zone
3. All students scanned against that zone

## Troubleshooting Geofence Issues

### Problem: Legitimate Students Rejected

**Possible Causes:**
1. Radius too small
2. Center coordinates inaccurate
3. Poor GPS signal

**Solutions:**
```
1. Increase radius by 50-100m
2. Verify coordinates with GPS app
3. Move class to area with clearer sky
4. Add margin for GPS accuracy (±50m)
```

### Problem: Invalid Scans Accepted

**Possible Causes:**
1. Radius too large
2. Spoofed GPS location (rare)
3. Multiple zones confusing assignment

**Solutions:**
```
1. Decrease radius by 50-100m
2. Enable device fingerprinting
3. Review audit logs for suspicious IPs
4. Use override feature for false positives
```

### Problem: GPS Not Working

**Troubleshooting Steps:**

1. **Check Browser Permissions**
   - Browser settings → Location → Allow
   - Clear cache and retry

2. **Test GPS Directly**
   - Open phone maps app
   - Verify location working
   - Compare coordinate accuracy

3. **Check System Logs**
   ```bash
   pm2 logs attendance-api | grep -i "gps\|location\|geofence"
   ```

4. **Manual Override**
   - Use admin override for affected students
   - Input justification
   - Mark as PRESENT

## Advanced Configuration

### Polygon Geofences (Beta)

For irregular campus shapes (future feature):

```json
{
  "type": "polygon",
  "coordinates": [
    [40.2050, -111.8900],
    [40.2080, -111.8900],
    [40.2080, -111.8920],
    [40.2050, -111.8920]
  ]
}
```

### Time-Based Geofences

Allow different zones at different times:

```javascript
// Future feature
const isInGeofence = (location, time) => {
  if (time.hour >= 8 && time.hour <= 17) {
    return validateMainCampus(location);
  } else {
    return validateExamCenter(location);
  }
};
```

## Best Practices

### 1. Accuracy Testing
- Test with multiple students
- Test at various locations within zone
- Test at boundary (just inside/outside)
- Document results

### 2. Seasonal Adjustments
- GPS accuracy varies seasonally
- Test after season changes (summer/winter)
- Adjust radius if needed

### 3. Documentation
- Keep record of all zones
- Document center coordinates
- Note reasoning for radius choice
- Update when campus expands

### 4. Student Communication
- Inform students of GPS requirement
- Explain acceptable locations
- Provide troubleshooting guide
- Allow alternative methods for failures

### 5. Regular Audits
- Review monthly:
  - Failed scans analysis
  - Geofence accuracy reports
  - GPS signal quality

## GPS Accuracy Report

Generate accuracy report via admin:

```bash
SELECT 
  COUNT(*) as total_scans,
  SUM(CASE WHEN is_within_geofence = true THEN 1 ELSE 0 END) as accepted,
  SUM(CASE WHEN is_within_geofence = false THEN 1 ELSE 0 END) as rejected,
  ROUND(100.0 * SUM(CASE WHEN is_within_geofence = true THEN 1 ELSE 0 END) 
    / COUNT(*), 2) as acceptance_rate,
  AVG(distance_from_center) as avg_distance
FROM attendance_records
WHERE scan_time > NOW() - INTERVAL '30 days';
```

## Calibration Procedure

For maximum accuracy:

### Step 1: Baseline Measurement
1. Position phone at known campus location
2. Record GPS reading 5 times
3. Calculate average coordinate
4. Note any variation

### Step 2: Boundary Testing
1. Stand at approximate 200m boundary
2. Note GPS reading
3. Move 50m further away
4. Verify rejection

### Step 3: Adjustment
1. If GPS varies >50m: increase radius
2. If variance <20m: radius is good
3. Document final setting

## Geofence Coordinates Database

Keep reference of local coordinates:

| Location | Latitude | Longitude | Purpose |
|----------|----------|-----------|---------|
| Campus Center | 40.2065 | -111.8910 | Main zone center |
| Library | 40.2070 | -111.8905 | Secondary zone |
| Exam Center | 40.2050 | -111.8915 | Test location |
| Sports Complex | 40.2040 | -111.8900 | Optional zone |

## Common Coordinates

### University Examples
- Harvard: 42.3601, -71.0589
- Stanford: 37.4275, -122.1697
- MIT: 42.3596, -71.0949
- UC Berkeley: 37.8722, -122.2597
- Yale: 41.3083, -72.9279

## Security Considerations

### GPS Spoofing Risk
- Low for legitimate students
- High for dedicated attackers
- Mitigated by device fingerprinting
- Combined with server-side verification

### Mitigation Strategies
1. Enable device fingerprinting
2. Log all scan attempts
3. Flag suspicious patterns
4. Manual review of failures
5. Combine with other verification

## Support & Escalation

### Geofence Issues Contact
- Tech Support: support@university.edu
- Location Issues: gps-support@university.edu
- Emergency Override: admin@university.edu

### Provide Information
- Class session ID
- Student ID
- GPS coordinates attempted
- Error message
- Building/location details

## FAQ

**Q: What if class is indoors?**
A: GPS may not work reliably indoors. Either move closer to windows, use manual verification, or enable admin override capability.

**Q: Can we use WiFi instead of GPS?**
A: Current version uses GPS only. WiFi support is planned for indoor locations.

**Q: How accurate is ±200m radius?**
A: For most outdoor campuses, 200m covers 1-2 city blocks. Typical classroom setups work well.

**Q: What about privacy?**
A: Location data is:
- Stored encrypted in database
- Only marked as in/out geofence
- Not shared with external services
- Deleted after configurable retention

**Q: Can students cheat by moving?**
A: Limited:
- QR expires after 5 minutes
- Device fingerprinting prevents proxy
- Audit logs show all attempts
- Geographic verification happens at scan time

---

For questions or assistance: geofence-support@university.edu
