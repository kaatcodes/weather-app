// app/routes/login.tsx
import { useState } from 'react';
import { Form, useActionData, useSearchParams, useNavigation } from '@remix-run/react';
import { json, redirect } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { login, createUserSession } from '~/models/auth.server';
import { TextField, Button, Box, Typography, Container, Paper, Alert } from '@mui/material';

interface ActionData {
  errors?: {
    username?: string;
    password?: string;
    form?: string;
  };
}

export const action: ActionFunction = async ({ request }) => {
  console.log('Login action started');
  const formData = await request.formData();
  const username = formData.get('username');
  const password = formData.get('password');
  const redirectTo = formData.get('redirectTo') || '/';

  console.log('Form data:', { username, redirectTo });

  if (typeof username !== 'string' || typeof password !== 'string') {
    console.log('Invalid form data types');
    return json<ActionData>(
      { errors: { form: 'Form not submitted correctly.' } },
      { status: 400 }
    );
  }

  if (username.length < 3) {
    console.log('Username too short');
    return json<ActionData>(
      { errors: { username: 'Username is too short' } },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    console.log('Password too short');
    return json<ActionData>(
      { errors: { password: 'Password is too short' } },
      { status: 400 }
    );
  }

  console.log('Attempting login...');
  const result = await login(username, password);
  console.log('Login result:', result.success ? 'Success' : 'Failed');

  if (!result.success) {
    if (result.error?.type === 'username') {
      return json<ActionData>(
        { errors: { username: result.error.message } },
        { status: 400 }
      );
    } else if (result.error?.type === 'password') {
      return json<ActionData>(
        { errors: { password: result.error.message } },
        { status: 400 }
      );
    } else {
      return json<ActionData>(
        { errors: { form: result.error?.message || 'An unexpected error occurred' } },
        { status: 400 }
      );
    }
  }

  console.log('Creating user session...');
  return createUserSession(result.user._id.toString(), redirectTo as string);
};

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Weather App Login
          </Typography>
          <Form method="post" noValidate>
            <input
              type="hidden"
              name="redirectTo"
              value={searchParams.get('redirectTo') ?? undefined}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              error={!!actionData?.errors?.username}
              helperText={actionData?.errors?.username}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              error={!!actionData?.errors?.password}
              helperText={actionData?.errors?.password}
            />
            {actionData?.errors?.form && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {actionData.errors.form}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form>
        </Paper>
      </Box>
    </Container>
  );
}
