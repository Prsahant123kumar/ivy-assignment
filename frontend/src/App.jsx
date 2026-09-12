import { useState, useEffect } from 'react';

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = import.meta.env.VITE_API_KEY;

function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  const [email, setEmail] = useState('demo1@ivy.homes');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [filterLocality, setFilterLocality] = useState('');

  // Favorites state
  const [favorites, setFavorites] = useState(new Set());

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      const newAccessToken = data.access_token; 
      
      localStorage.setItem('access_token', newAccessToken);
      setToken(newAccessToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setListings([]);
    setRentals([]);
    setProjects([]);
  };

  // Fetch all datasets once logged in
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setFetchingData(true);
      const headers = {
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${token}`
      };

      try {
        const [listingsRes, rentalsRes, projectsRes] = await Promise.all([
          fetch(`${BASE_URL}/v1/listings?page=1&limit=50`, { headers }),
          fetch(`${BASE_URL}/v1/rentals?page=1&limit=50`, { headers }),
          fetch(`${BASE_URL}/v1/projects?page=1&limit=50`, { headers })
        ]);

        if (listingsRes.status === 401 || rentalsRes.status === 401 || projectsRes.status === 401) {
          handleLogout();
          throw new Error('Session expired (15-min limit reached). Please log in again.');
        }

        const listingsData = await listingsRes.json();
        const rentalsData = await rentalsRes.json();
        const projectsData = await projectsRes.json();

        setListings(listingsData.results || []);
        setRentals(rentalsData.results || []);
        setProjects(projectsData.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, [token]);

  const toggleFavorite = async (listingId) => {
    const headers = {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      if (favorites.has(listingId)) {
        // Remove favorite
        await fetch(`${BASE_URL}/v1/favourites/${listingId}`, { method: 'DELETE', headers });
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        // Add favorite
        await fetch(`${BASE_URL}/v1/favourites`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ listing_id: listingId })
        });
        setFavorites(prev => new Set(prev).add(listingId));
      }
    } catch (err) {
      console.error('Failed to update favorite status', err);
    }
  };

  const currentData = activeTab === 'listings' ? listings : activeTab === 'rentals' ? rentals : projects;

  const filteredData = currentData.filter(item => 
    filterLocality === '' || item.locality?.toLowerCase().includes(filterLocality.toLowerCase())
  );

  if (!token) {
    return (
      <div style={{ padding: '2rem', maxWidth: '400px', margin: '4rem auto', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2>Ivy Homes Portal</h2>
        {error && <p style={{ color: 'red', backgroundColor: '#fee', padding: '0.5rem', borderRadius: '4px' }}>{error}</p>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Email:</label><br />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
          </div>
          <div>
            <label>Password:</label><br />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '0.75rem', cursor: 'pointer', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
        <h1>Ivy Homes Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>Log Out</button>
      </div>

      {error && <p style={{ color: 'red', backgroundColor: '#fee', padding: '0.5rem', marginTop: '1rem' }}>{error}</p>}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {['listings', 'rentals', 'projects', 'insights'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            style={{ 
              padding: '0.5rem 1rem', 
              cursor: 'pointer', 
              fontWeight: activeTab === tab ? 'bold' : 'normal', 
              background: activeTab === tab ? '#007BFF' : '#f8f9fa', 
              color: activeTab === tab ? 'white' : 'black', 
              border: 'none', 
              borderRadius: '4px',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'insights' ? '📊 Insights & Discrepancies' : `${tab} (${tab === 'listings' ? listings.length : tab === 'rentals' ? rentals.length : projects.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'insights' ? (
        <div style={{ background: '#f9f9f9', padding: '2rem', borderRadius: '8px', border: '1px solid #e1e1e1' }}>
          <h2>API Analysis & Disguised Findings</h2>
          <p>This dashboard summarizes the core analytical findings and documentation bugs discovered during the assessment.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #ddd' }}>
              <h4>Total Retrievable Listings</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007BFF' }}>3,200</p>
            </div>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #ddd' }}>
              <h4>Unique Properties (GPS)</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>50</p>
            </div>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #ddd' }}>
              <h4>Fake Listings Detected</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>14</p>
            </div>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #ddd' }}>
              <h4>Corrupt Listing IDs</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>4</p>
            </div>
          </div>

          <h3>Key Documentation Discrepancies</h3>
          <ul style={{ lineHeight: '1.6' }}>
            <li><strong>Authentication Header:</strong> Docs state API key goes in query params; actual implementation requires the <code>X-API-Key</code> header.</li>
            <li><strong>Token Property Name:</strong> Docs state response key is <code>token</code>; actual key is <code>access_token</code> with a strict 15-minute expiration.</li>
            <li><strong>Pagination Limit:</strong> Docs claim a max limit of 200, but requests are hard-capped at 50.</li>
            <li><strong>Project Pricing Units:</strong> Project prices are returned as floats representing Crores, not raw Indian Rupees.</li>
            <li><strong>Timestamp Timezones:</strong> Timestamps lack the 'Z' suffix and are natively set to IST (+05:30).</li>
          </ul>
        </div>
      ) : (
        <>
          <div style={{ margin: '1.5rem 0' }}>
            <input 
              type="text" 
              placeholder="Filter by locality (e.g., sector 49)..." 
              value={filterLocality}
              onChange={(e) => setFilterLocality(e.target.value)}
              style={{ padding: '0.5rem', width: '320px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          {fetchingData ? (
            <p>Loading records from API endpoints...</p>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '1.5rem', 
              maxHeight: '70vh', 
              overflowY: 'auto', 
              paddingRight: '0.5rem' 
            }}>
              {filteredData.map(item => {
                const id = item.listing_id || item.project_id;
                const isFav = favorites.has(id);
                return (
                  <div key={id} style={{ border: '1px solid #ddd', padding: '1.25rem', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
                    {item.listing_id && (
                      <button 
                        onClick={() => toggleFavorite(item.listing_id)}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
                        title="Toggle Favorite"
                      >
                        {isFav ? '❤️' : '🤍'}
                      </button>
                    )}
                    <h3 style={{ marginTop: 0, color: '#333', paddingRight: '2rem' }}>{item.title || item.apartment_name}</h3>
                    <p><strong>Locality:</strong> {item.locality}</p>
                    <p><strong>Price:</strong> ₹{item.price ? item.price.toLocaleString('en-IN') : `${item.price_min} - ${item.price_max} Cr`}</p>
                    <p><strong>Configuration:</strong> {item.bedroom ? `${item.bedroom} BHK | ${item.carpet_area} sqft` : `${item.total_units} Units | ${item.total_floors} Floors`}</p>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 0 }}>Source: {item.website || item.developer_name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;