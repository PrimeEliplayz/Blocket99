import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Replace these with the project URL and public anon key from Supabase.
const SUPABASE_URL = 'https://kralnytkfdiodqzchfzv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYWxueXRrZmRpb2RxemNoZnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjY2NDYsImV4cCI6MjEwNjQ0MjY0Nn0.Sgd6jWlCWA7feYX7kSe7e9STmYfjQoYOzF6qov5CgOQ';
const isConfigured = !SUPABASE_URL.includes('YOUR_PROJECT_ID')
    && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');
export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function showConfigurationError(status) {
    status.textContent = 'Add your Supabase project URL and anon key in auth.js to enable authentication.';
    status.dataset.state = 'error';
}

export function setupAuthForm(form) {
    const status = document.getElementById('auth-status');
    const signupMode = window.location.hash === '#signup';
    const usernameField = document.getElementById('username-field');
    const emailField = document.getElementById('email-field');
    const passwordField = document.getElementById('password-field');
    const submitButton = document.getElementById('submit-button');

    usernameField.hidden = !signupMode;
    usernameField.required = signupMode;
    emailField.required = true;
    passwordField.autocomplete = signupMode ? 'new-password' : 'current-password';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = '';
        status.dataset.state = '';

        if (!isConfigured) {
            showConfigurationError(status);
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = signupMode ? 'Creating account...' : 'Logging in...';

        try {
            const email = emailField.value.trim();
            const password = passwordField.value;
            let result;

            if (signupMode) {
                result = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username: usernameField.value.trim() },
                        emailRedirectTo: new URL('stats.html', window.location.href).href
                    }
                });
            } else {
                result = await supabase.auth.signInWithPassword({ email, password });
            }

            if (result.error) throw result.error;

            if (signupMode && !result.data.session) {
                status.textContent = 'Account created. Check your email to confirm your address, then log in.';
                status.dataset.state = 'success';
                return;
            }

            window.location.assign('stats.html');
        } catch (error) {
            status.textContent = error.message || 'Authentication failed. Please try again.';
            status.dataset.state = 'error';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = signupMode ? 'Sign Up' : 'Login';
        }
    });
}

export async function getCurrentUser() {
    if (!supabase) return { user: null, error: new Error('Supabase is not configured.') };

    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
}

export async function getStatsPageData(userId) {
    if (!supabase) return { error: new Error('Supabase is not configured.') };

    const [profileResult, statsResult, badgesResult, earnedBadgesResult] = await Promise.all([
        supabase.from('profiles').select('username, avatar_path, created_at').eq('id', userId).single(),
        supabase.from('player_stats').select('packs_opened, blooks_unlocked, total_blooks, tokens').eq('user_id', userId).single(),
        supabase.from('badges').select('id, name, description, image_path').order('name'),
        supabase.from('user_badges').select('badge_id').eq('user_id', userId)
    ]);

    const error = profileResult.error || statsResult.error || badgesResult.error || earnedBadgesResult.error;
    if (error) return { error };

    return {
        profile: profileResult.data,
        stats: statsResult.data,
        badges: badgesResult.data,
        earnedBadgeIds: new Set(earnedBadgesResult.data.map((badge) => badge.badge_id))
    };
}

export async function signOut() {
    if (!supabase) return { error: new Error('Supabase is not configured.') };

    const { error } = await supabase.auth.signOut();
    return { error };
}
