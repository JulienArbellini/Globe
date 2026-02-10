import React, { useState, useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';


function App() {
  const globeRef = useRef();

  const [countriesData, setCountriesData] = useState([]);
  const [hoverCountry, setHoverCountry] = useState(null); // <-- hover par code pays
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);

  // --- FETCH GEOJSON
  useEffect(() => {
    fetch('/data/countries.geojson')
      .then(res => res.json())
      .then(data => {
        const flattened = data.features.flatMap((feature, i) => {
          const geom = feature.geometry;
          if (geom.type === 'Polygon') {
            return [{ ...feature, geometry: geom, colorIndex: i }];
          } else if (geom.type === 'MultiPolygon') {
            return geom.coordinates.map(coords => ({
              ...feature,
              geometry: { type: 'Polygon', coordinates: coords },
              colorIndex: i,
            }));
          }
          return [];
        });
        setCountriesData(flattened);
      })
      .catch(err => console.error('Erreur GeoJSON:', err));
  }, []);

  // --- CALCUL CENTROID (robuste pour chaque polygon)
  const getCentroid = polygon => {
    const coords = polygon.geometry.coordinates[0];
    let lat = 0;
    let lng = 0;
    coords.forEach(coord => {
      lng += coord[0];
      lat += coord[1];
    });
    return { lat: lat / coords.length, lng: lng / coords.length };
  };

  // --- FOCUS SUR UN PAYS
  const focusCountry = country => {
    if (!country || !globeRef.current) return;

    const { lat, lng } = getCentroid(country);

    globeRef.current.pointOfView(
      { lat, lng, altitude: 1.4 },
      1500
    );

    // On sélectionne le code du pays, pas le polygon
    setHoverCountry(country.properties.ADM0_A3);

    // On met à jour la barre de recherche
    setSearch(country.properties.ADMIN);
    setFiltered([]);
  };


// --- LOGIQUE DE RECHERCHE DÉDUPLIQUÉE
useEffect(() => {
  if (!search) {
    setFiltered([]);
    return;
  }

  // On filtre d’abord tous les polygons qui matchent la recherche
  const matched = countriesData.filter(c =>
    c.properties.ADMIN.toLowerCase().includes(search.toLowerCase())
  );

  // Puis on crée un Map pour ne garder qu’un seul polygon par pays (clé = ADM0_A3)
  const uniqueCountries = Array.from(
    new Map(matched.map(c => [c.properties.ADM0_A3, c])).values()
  );

  // Limite à 8 résultats
  setFiltered(uniqueCountries.slice(0, 8));
}, [search, countriesData]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* --- SEARCH BAR */}
      <div style={{
        position: 'absolute',
        top: 30,
        left: 30,
        zIndex: 10,
        width: 260
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un pays..."
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
          }}
        />

        {filtered.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            marginTop: 6,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }}>
            {filtered.map(country => (
              <div
                key={country.properties.ADM0_A3 + country.geometry.coordinates[0][0]}
                onClick={() => focusCountry(country)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                {country.properties.ADMIN}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- GLOBE */}
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        polygonsData={countriesData}
        polygonGeoJsonGeometry="geometry"
        polygonLabel={d => d?.properties?.ADMIN || ''}
        polygonAltitude={d =>
          d.properties.ADM0_A3 === hoverCountry ? 0.15 : 0.05
        }
        polygonCapColor={d =>
          d.properties.ADM0_A3 === hoverCountry
            ? 'rgba(233,196,106,0.95)'
            : 'rgba(255,255,255,0.36)'
        }
        polygonSideColor={d =>
          d.properties.ADM0_A3 === hoverCountry
            ? 'rgba(233,196,106,0.6)'
            : 'rgba(255,255,255,0.03)'
        }
        polygonStrokeColor={() => 'rgba(255,255,255,0.08)'}
        onPolygonHover={d => setHoverCountry(d?.properties.ADM0_A3 || null)}
        animatePolygonsTransition
      />
    </div>
  );
}

export default App;