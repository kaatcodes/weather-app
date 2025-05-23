import { useState, useEffect } from 'react';
import { json, redirect } from '@remix-run/node';
import { Form, useLoaderData, useSubmit, useActionData, useFetcher } from '@remix-run/react';
import type { LoaderFunction, ActionFunction } from '@remix-run/node';
import { requireUserId, getUser, logout } from '~/models/auth.server';
import { getWeatherForCity, WeatherError, type CitySuggestion } from '~/services/weather.server';
import { User } from '~/models/user.server';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  TextField,
  Button,
  Box,
  IconButton,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';

interface LoaderData {
  user: Awaited<ReturnType<typeof getUser>>;
  weatherData: (Awaited<ReturnType<typeof getWeatherForCity>> | { error: string })[];
}

interface ActionData {
  error?: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const user = await getUser(request);
  if (!user) throw redirect('/login');

  const weatherData = await Promise.all(
    user.favorites.map(async (city: string) => {
      try {
        return await getWeatherForCity(city);
      } catch (error) {
        if (error instanceof WeatherError) {
          return { error: error.message };
        }
        return { error: `Failed to fetch weather for ${city}` };
      }
    })
  );

  return json<LoaderData>({ user, weatherData });
};

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const action = formData.get('action')?.toString();

  if (action === 'logout') {
    return logout(request);
  }

  const city = formData.get('city')?.toString();

  if (action === 'add' && city) {
    try {
      // Verify the city exists before adding it
      await getWeatherForCity(city);
      
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (user.favorites.length >= 5) {
        return json<ActionData>(
          { error: 'Maximum 5 cities allowed' },
          { status: 400 }
        );
      }

      // Normalize city names for comparison
      const normalizedNewCity = city.trim().toLowerCase();
      const isDuplicate = user.favorites.some(
        existingCity => existingCity.trim().toLowerCase() === normalizedNewCity
      );

      if (isDuplicate) {
        return json<ActionData>(
          { error: 'City already in favorites' },
          { status: 400 }
        );
      }

      user.favorites.push(city.trim());
      await user.save();
    } catch (error: unknown) {
      if (error instanceof WeatherError) {
        return json<ActionData>(
          { error: error.message },
          { status: 400 }
        );
      }
      return json<ActionData>(
        { error: 'Failed to add city' },
        { status: 400 }
      );
    }
  } else if (action === 'remove' && city) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    // Normalize city names for comparison
    const normalizedCityToRemove = city.trim().toLowerCase();
    user.favorites = user.favorites.filter(
      existingCity => existingCity.trim().toLowerCase() !== normalizedCityToRemove
    );
    await user.save();
  }

  return redirect('/');
};

export default function Index() {
  const { user, weatherData } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [showError, setShowError] = useState(false);
  const submit = useSubmit();
  const suggestionsFetcher = useFetcher<{ suggestions: CitySuggestion[] }>();
  const [inputValue, setInputValue] = useState('');

  const handleAddCity = (city: CitySuggestion | null) => {
    if (!city) return;

    const formData = new FormData();
    formData.append('city', city.name);
    formData.append('action', 'add');
    submit(formData, { method: 'post' });
    setInputValue('');
  };

  const handleRemoveCity = (city: string) => {
    const formData = new FormData();
    formData.append('city', city.trim());
    formData.append('action', 'remove');
    submit(formData, { method: 'post' });
  };

  const handleLogout = () => {
    const formData = new FormData();
    formData.append('action', 'logout');
    submit(formData, { method: 'post' });
  };

  // Show error message when actionData.error changes
  useEffect(() => {
    if (actionData?.error) {
      setShowError(true);
    }
  }, [actionData?.error]);

  // Fetch suggestions when input changes
  useEffect(() => {
    if (inputValue.length >= 2) {
      suggestionsFetcher.load(`/api/suggestions?q=${encodeURIComponent(inputValue)}`);
    }
  }, [inputValue]);

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#2F3E46' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ 
            flexGrow: 1,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '1.5rem',
            pl: 2,
            py: 1,
          }}>
            Weather App
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ 
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '1rem',
              pr: 2,
              py: 1,
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: '2.5rem',
          color: '#1a1a1a',
          mb: 4,
          mt: 4,
        }}>
          Welcome to the weather app {user?.username}
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Autocomplete
            value={null}
            inputValue={inputValue}
            onInputChange={(_, newValue) => setInputValue(newValue)}
            onChange={(_, newValue) => handleAddCity(newValue)}
            options={suggestionsFetcher.data?.suggestions || []}
            getOptionLabel={(option) => 
              typeof option === 'string' ? option : `${option.name}, ${option.country}`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={suggestionsFetcher.state === 'loading'}
            disabled={user?.favorites.length >= 5}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label="Add a city"
                helperText={
                  user?.favorites.length >= 5
                    ? 'Maximum 5 cities allowed'
                    : 'Start typing to search for a city'
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '1rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '1rem'
                  },
                  '& .MuiFormHelperText-root': {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.875rem'
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {suggestionsFetcher.state === 'loading' ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Box>

        <Grid container spacing={3}>
          {weatherData.map((weather, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ 
                width: '368px',
                height: '350px',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                background: '#e3e3e3',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontFamily: 'Inter, sans-serif',
                justifyContent: 'space-between',
                alignItems: 'stretch',
                p: 0,
                m: 'auto',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {'error' in weather ? (
                  <CardContent sx={{ 
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h5" component="h2" color="error" sx={{ 
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: '1.25rem'
                      }}>
                        Error
                      </Typography>
                      <IconButton
                        onClick={() => handleRemoveCity(weather.error.split('"')[1] || '')}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <Typography color="error" sx={{ 
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '1rem',
                      mt: 1
                    }}>
                      {weather.error}
                    </Typography>
                  </CardContent>
                ) : (
                  <CardContent sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 0,
                    m: 0,
                    height: '100%',
                    position: 'relative',
                  }}>
                    {/* Delete button */}
                    <IconButton
                      aria-label="delete"
                      onClick={() => handleRemoveCity(weather.location.name)}
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        color: '#b0b0b0',
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        '&:hover': {
                          color: '#e57373',
                          backgroundColor: 'rgba(255,255,255,1)',
                        },
                        zIndex: 2,
                      }}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    {/* Top: City and description */}
                    <Box sx={{ px: '35px', pt: 3 }}>
                      <Typography sx={{
                        fontFamily: 'Inter',
                        fontWeight: 600,
                        fontSize: '34px',
                        color: '#181818',
                        lineHeight: 1.1,
                        letterSpacing: '-0.5px',
                      }}>
                        {weather.location.name}
                      </Typography>
                      <Typography sx={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontSize: '15px',
                        color: '#666',
                        mt: 0.5,
                        mb: 2,
                        letterSpacing: '0.5px',
                      }}>
                        {weather.current.condition.text}
                      </Typography>
                    </Box>
                    {/* Center: Temperature and icon */}
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      px: '35px',
                      mt: 3,
                      mb: 4,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Typography sx={{
                          fontFamily: 'Inter',
                          fontWeight: 300,
                          fontSize: '96px',
                          lineHeight: 1,
                          color: '#181818',
                        }}>
                          {weather.current.temp_c}
                        </Typography>
                        <Typography sx={{
                          fontFamily: 'Inter',
                          fontWeight: 300,
                          fontSize: '32px',
                          color: '#888',
                          mt: '18px',
                          ml: '4px',
                        }}>
                          °C
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }} />
                      <Box sx={{
                        width: '70px',
                        height: '70px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ml: 2,
                      }}>
                        <img
                          src={`https:${weather.current.condition.icon}`}
                          alt={weather.current.condition.text}
                          style={{ width: '70px', height: '70px', objectFit: 'contain' }}
                        />
                      </Box>
                    </Box>
                    {/* Bottom: Precipitation and Humidity */}
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      px: '35px',
                      pb: 3,
                      mt: 2,
                    }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{
                          fontFamily: 'Inter',
                          fontWeight: 400,
                          fontSize: '24px',
                          color: '#181818',
                          lineHeight: 1.1,
                        }}>
                          {weather.current.precip_mm}mm
                        </Typography>
                        <Typography sx={{
                          fontFamily: 'Inter',
                          fontWeight: 400,
                          fontSize: '13px',
                          color: '#888',
                          mt: 0.5,
                          letterSpacing: '1px',
                        }}>
                          Precipitation
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{
                          fontFamily: 'Inter',
                          fontWeight: 400,
                          fontSize: '24px',
                          color: '#181818',
                          lineHeight: 1.1,
                        }}>
                          {weather.current.humidity}%
                        </Typography>
                        <Typography sx={{
                          fontFamily: 'Inter',
                          fontWeight: 400,
                          fontSize: '13px',
                          color: '#888',
                          mt: 0.5,
                          letterSpacing: '1px',
                        }}>
                          Humidity
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>

        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={() => setShowError(false)}
        >
          <Alert
            onClose={() => setShowError(false)}
            severity="error"
            sx={{ 
              width: '100%',
              fontFamily: 'Inter, sans-serif',
              '& .MuiAlert-message': {
                fontSize: '1rem'
              }
            }}
          >
            {actionData?.error}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
} 