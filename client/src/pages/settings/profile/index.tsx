import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { getProfile, updateProfile, changePassword, uploadImage, type ProfileUpdateData } from "@/services/settingsService"
import { getAssetUrl } from "@/lib/utils"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Lock, Save, Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getProfile().then(data => { setProfile(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const updateMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) => updateProfile(data),
    onSuccess: () => toast.success('Profile updated'),
    onError: () => toast.error('Failed to update profile')
  })

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => changePassword(data),
    onSuccess: () => { toast.success('Password changed'); setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }) },
    onError: () => toast.error('Failed to change password')
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    updateMutation.mutate({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email,
      profileImage: profile.profileImage
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    passwordMutation.mutate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await uploadImage(file);

      if (profile) {
        const updatedProfile = { ...profile, profileImage: data.url };
        setProfile(updatedProfile);

        // Auto-save the new profile image
        updateMutation.mutate({
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          phone: updatedProfile.phone,
          email: updatedProfile.email,
          profileImage: data.url
        });
      } else {
        setProfile({ profileImage: data.url } as any);
      }

    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-16"><div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Personal Information</CardTitle><CardDescription>Update your name and contact details</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Profile Image Section */}
                  <div className="flex items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Avatar className="h-24 w-24 border-primary/20 ring-4 ring-background shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <AvatarImage
                          src={getAssetUrl(profile?.profileImage)}
                          className="object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                          {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                        {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Profile Picture</h3>
                      <p className="text-sm text-muted-foreground mt-1">Click the avatar to upload. SVG, PNG, JPG or GIF (max. 800x400px).</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2"><Label>First Name</Label><Input value={profile?.firstName || ''} onChange={e => setProfile(p => p ? { ...p, firstName: e.target.value } : null)} className="h-10" /></div>
                    <div className="space-y-2"><Label>Last Name</Label><Input value={profile?.lastName || ''} onChange={e => setProfile(p => p ? { ...p, lastName: e.target.value } : null)} className="h-10" /></div>
                  </div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={profile?.email || ''} onChange={e => setProfile(p => p ? { ...p, email: e.target.value } : null)} className="h-10" /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={profile?.phone || ''} onChange={e => setProfile(p => p ? { ...p, phone: e.target.value } : null)} className="h-10" /></div>
                  <div className="pt-2">
                    <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"><Save className="h-4 w-4 mr-2" />Save Changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Change Password</CardTitle><CardDescription>Update your password</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div><Label>Current Password</Label><Input type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required /></div>
                  <div><Label>New Password</Label><Input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required /></div>
                  <div><Label>Confirm New Password</Label><Input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required /></div>
                  <Button type="submit" variant="outline">Change Password</Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
