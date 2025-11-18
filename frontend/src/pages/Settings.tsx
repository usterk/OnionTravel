import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { userApi, apiKeyApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, AtSign, ImageIcon, Key, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import type { UserResponse } from '@/types/user';
import type { ApiKeyResponse, ApiKeyWithSecret } from '@/types/apiKey';

const profileSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  full_name: z.string().optional(),
  avatar_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

const apiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type ApiKeyFormData = z.infer<typeof apiKeySchema>;

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [showCreateKeyForm, setShowCreateKeyForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyWithSecret | null>(null);
  const [showFullKey, setShowFullKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerKey,
    handleSubmit: handleSubmitKey,
    formState: { errors: keyErrors },
    reset: resetKey,
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  });

  useEffect(() => {
    loadUserProfile();
    loadApiKeys();
  }, []);

  const loadUserProfile = async () => {
    setIsFetching(true);
    setError(null);

    try {
      const user = await userApi.getCurrentUser();
      setCurrentUser(user);
      reset({
        email: user.email,
        username: user.username,
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setIsFetching(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedUser = await userApi.updateProfile({
        email: data.email,
        username: data.username,
        full_name: data.full_name || null,
        avatar_url: data.avatar_url || null,
      });

      setCurrentUser(updatedUser);
      setSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const keys = await apiKeyApi.listApiKeys();
      setApiKeys(keys);
    } catch (err: any) {
      console.error('Failed to load API keys:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const onCreateApiKey = async (data: ApiKeyFormData) => {
    setIsLoadingKeys(true);
    setError(null);

    try {
      const newKey = await apiKeyApi.createApiKey(data);
      setNewlyCreatedKey(newKey);
      setShowFullKey(true);
      setShowCreateKeyForm(false);
      resetKey();
      await loadApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create API key');
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const onDeleteApiKey = async (keyId: number) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    setIsLoadingKeys(true);
    setError(null);

    try {
      await apiKeyApi.deleteApiKey(keyId);
      await loadApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete API key');
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const copyToClipboard = async (text: string, keyId?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (keyId) {
        setCopiedKeyId(keyId);
        setTimeout(() => setCopiedKeyId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (isFetching) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-1">Manage your profile information</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your account details and personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center">
                  <AtSign className="h-4 w-4 mr-2" />
                  Username
                </Label>
                <Input
                  id="username"
                  {...register('username')}
                  placeholder="username"
                />
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  placeholder="John Doe (optional)"
                />
                {errors.full_name && (
                  <p className="text-sm text-red-600">{errors.full_name.message}</p>
                )}
              </div>

              {/* Avatar URL */}
              <div className="space-y-2">
                <Label htmlFor="avatar_url" className="flex items-center">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Avatar URL
                </Label>
                <Input
                  id="avatar_url"
                  {...register('avatar_url')}
                  placeholder="https://example.com/avatar.jpg (optional)"
                />
                {errors.avatar_url && (
                  <p className="text-sm text-red-600">{errors.avatar_url.message}</p>
                )}
                {currentUser?.avatar_url && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Current avatar:</p>
                    <img
                      src={currentUser.avatar_url}
                      alt="Avatar preview"
                      className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Account Info */}
              {currentUser && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Account created: {new Date(currentUser.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Last updated: {new Date(currentUser.updated_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* API Keys Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                API Keys
              </div>
              <Button
                size="sm"
                onClick={() => setShowCreateKeyForm(!showCreateKeyForm)}
                variant={showCreateKeyForm ? 'outline' : 'default'}
              >
                <Plus className="h-4 w-4 mr-2" />
                {showCreateKeyForm ? 'Cancel' : 'Create New Key'}
              </Button>
            </CardTitle>
            <CardDescription>
              Manage API keys for programmatic access to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Newly Created Key Alert */}
            {newlyCreatedKey && showFullKey && (
              <Alert className="mb-6 bg-yellow-50 border-yellow-200">
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-semibold text-yellow-900">
                      API Key Created Successfully!
                    </p>
                    <p className="text-sm text-yellow-800">
                      Save this key securely - it won't be shown again.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white border border-yellow-300 rounded text-sm font-mono break-all">
                        {newlyCreatedKey.key}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          copyToClipboard(newlyCreatedKey.key);
                          setTimeout(() => setShowFullKey(false), 2000);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowFullKey(false);
                        setNewlyCreatedKey(null);
                      }}
                    >
                      I've saved my key
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Create Key Form */}
            {showCreateKeyForm && (
              <form onSubmit={handleSubmitKey(onCreateApiKey)} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key_name">
                      Key Name / Description
                    </Label>
                    <Input
                      id="key_name"
                      {...registerKey('name')}
                      placeholder="e.g., Mobile App, Automation Script"
                    />
                    {keyErrors.name && (
                      <p className="text-sm text-red-600">{keyErrors.name.message}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={isLoadingKeys}>
                    {isLoadingKeys ? 'Creating...' : 'Create API Key'}
                  </Button>
                </div>
              </form>
            )}

            {/* API Keys List */}
            <div className="space-y-3">
              {isLoadingKeys && apiKeys.length === 0 ? (
                <p className="text-center text-gray-600 py-8">Loading API keys...</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-center text-gray-600 py-8">
                  No API keys yet. Create one to get started.
                </p>
              ) : (
                apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{key.name}</p>
                        {!key.is_active && (
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <code className="font-mono">{key.prefix}...</code>
                        <span>
                          Created: {new Date(key.created_at).toLocaleDateString()}
                        </span>
                        {key.last_used_at && (
                          <span>
                            Last used: {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(key.prefix, key.id)}
                      >
                        <Copy className="h-4 w-4" />
                        {copiedKeyId === key.id ? 'Copied!' : ''}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteApiKey(key.id)}
                        disabled={isLoadingKeys}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Usage Instructions */}
            {apiKeys.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  How to use API keys:
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Include the API key in the <code className="font-mono bg-blue-100 px-1">X-API-Key</code> header</li>
                  <li>Example: <code className="font-mono bg-blue-100 px-1">X-API-Key: ak_your_key_here</code></li>
                  <li>API keys work as an alternative to JWT tokens for authentication</li>
                  <li>Perfect for scripts, automation, and mobile apps</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
