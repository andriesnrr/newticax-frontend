'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { updateProfile, updatePassword, updatePreferences } from '@/services/user-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { getCategories } from '@/services/category-service';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  bio: z.string().optional(),
  image: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

// Password form schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, {
    message: 'Current password is required.',
  }),
  newPassword: z.string().min(6, {
    message: 'New password must be at least 6 characters.',
  }),
  confirmPassword: z.string().min(6, {
    message: 'Confirm password is required.',
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

// Preferences form schema
const preferencesFormSchema = z.object({
  language: z.enum(['ENGLISH', 'INDONESIAN']),
  categories: z.array(z.string()).optional(),
  notifications: z.boolean().default(true),
  darkMode: z.boolean().default(false),
  emailUpdates: z.boolean().default(true),
});

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, checkAuth } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  });
  
  const { setLanguage } = useAuthStore();

  // Fetch categories
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ limit: 100 }),
  });

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      image: user?.image || '',
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Preferences form
  const preferencesForm = useForm<z.infer<typeof preferencesFormSchema>>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      language: user?.language || 'ENGLISH',
      categories: user?.preference?.categories || [],
      notifications: user?.preference?.notifications !== undefined ? user.preference.notifications : true,
      darkMode: user?.preference?.darkMode !== undefined ? user.preference.darkMode : false,
      emailUpdates: user?.preference?.emailUpdates !== undefined ? user.preference.emailUpdates : true,
    },
  });

  // Handle profile update
  const onProfileSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    try {
      await updateProfile(data);
      toast.success('Profile updated successfully');
      await checkAuth(); // Refresh user data
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  // Handle password update
  const onPasswordSubmit = async (data: z.infer<typeof passwordFormSchema>) => {
    try {
      await updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password updated successfully');
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error('Failed to update password');
    }
  };

  // Handle preferences update
  const onPreferencesSubmit = async (data: z.infer<typeof preferencesFormSchema>) => {
    try {
      // Update language if changed
      if (data.language !== user?.language) {
        await setLanguage(data.language);
      }
      
      // Update other preferences
      await updatePreferences({
        categories: data.categories || [],
        notifications: data.notifications,
        darkMode: data.darkMode,
        emailUpdates: data.emailUpdates,
      });
      
      toast.success('Preferences updated successfully');
      checkAuth(); // Refresh user data
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  // Get user initials for avatar
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex justify-center">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={profileForm.watch('image')} />
                        <AvatarFallback className="text-2xl">
                          {getInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profile Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/your-image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Tell us about yourself" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.provider !== 'EMAIL' ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
                  <p className="text-yellow-800 dark:text-yellow-300">
                    You're signed in using {user?.provider?.toLowerCase() || 'social login'}. Password change is only available for email accounts.
                  </p>
                </div>
              ) : (
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                      {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>User Preferences</CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCategoriesLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : (
                <Form {...preferencesForm}>
                  <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                    <FormField
                      control={preferencesForm.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Language</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ENGLISH">English</SelectItem>
                              <SelectItem value="INDONESIAN">Indonesian</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Content will be prioritized in your preferred language
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Categories of Interest</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {categoriesData?.data.map((category) => (
                          <FormField
                            key={category.id}
                            control={preferencesForm.control}
                            name="categories"
                            render={({ field }) => {
                              const isSelected = field.value?.includes(category.id);
                              return (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      className="form-checkbox h-4 w-4"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const value = field.value || [];
                                        if (e.target.checked) {
                                          field.onChange([...value, category.id]);
                                        } else {
                                          field.onChange(value.filter((id) => id !== category.id));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="cursor-pointer">
                                    {category.name}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Notifications & Appearance</h3>
                      <div className="space-y-4">
                        <FormField
                          control={preferencesForm.control}
                          name="notifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0">
                              <div className="space-y-0.5">
                                <FormLabel className="cursor-pointer">Notifications</FormLabel>
                                <FormDescription>Receive activity notifications</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={preferencesForm.control}
                          name="darkMode"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0">
                              <div className="space-y-0.5">
                                <FormLabel className="cursor-pointer">Dark Mode</FormLabel>
                                <FormDescription>Use dark theme</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={preferencesForm.control}
                          name="emailUpdates"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0">
                              <div className="space-y-0.5">
                                <FormLabel className="cursor-pointer">Email Updates</FormLabel>
                                <FormDescription>Receive news digests and updates</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={preferencesForm.formState.isSubmitting}>
                      {preferencesForm.formState.isSubmitting ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}