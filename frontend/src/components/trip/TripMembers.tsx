import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { tripApi, userApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { TripMemberInfo, TripRole } from '@/types/trip';
import type { UserResponse } from '@/types/user';
import { UserPlus, Trash2, Search } from 'lucide-react';

interface TripMembersProps {
  tripId: number;
  members: TripMemberInfo[];
  ownerId: number;
  onMembersUpdated: () => void;
}

export function TripMembers({ tripId, members, ownerId, onMembersUpdated }: TripMembersProps) {
  const { user } = useAuthStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Role management
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TripMemberInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState<TripRole>('member');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TripMemberInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getUserRole = (): TripRole | null => {
    if (!user) return null;
    const member = members.find((m) => m.user_id === user.id);
    return member?.role || null;
  };

  const canManageMembers = () => {
    const role = getUserRole();
    return role === 'owner' || role === 'admin';
  };

  const canChangeRoles = () => {
    const role = getUserRole();
    return role === 'owner';
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await userApi.searchUsers(searchQuery);
      // Filter out users who are already members
      const memberIds = members.map((m) => m.user_id);
      const filteredResults = results.filter((u) => !memberIds.includes(u.id));
      setSearchResults(filteredResults);

      if (filteredResults.length === 0) {
        setError('No users found or all users are already members');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: number) => {
    setIsAdding(true);
    setError(null);

    try {
      await tripApi.addMember(tripId, { user_id: userId });
      setIsAddDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      onMembersUpdated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await tripApi.removeMember(tripId, memberToDelete.user_id);
      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);
      onMembersUpdated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;

    setIsUpdatingRole(true);
    setError(null);

    try {
      await tripApi.updateMember(tripId, selectedMember.user_id, { role: selectedRole });
      setIsRoleDialogOpen(false);
      setSelectedMember(null);
      onMembersUpdated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update member role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const openRoleDialog = (member: TripMemberInfo) => {
    setSelectedMember(member);
    setSelectedRole(member.role);
    setIsRoleDialogOpen(true);
  };

  const openDeleteDialog = (member: TripMemberInfo) => {
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trip Members</CardTitle>
              <CardDescription>
                People who have access to this trip
              </CardDescription>
            </div>
            {canManageMembers() && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{member.full_name || member.username}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => canChangeRoles() && member.user_id !== ownerId && openRoleDialog(member)}
                  >
                    {member.role}
                  </Badge>
                  {canManageMembers() && member.user_id !== ownerId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(member)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader onClose={() => setIsAddDialogOpen(false)}>
            <DialogTitle>Add Member to Trip</DialogTitle>
            <DialogDescription>
              Search for users by email or username
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{user.full_name || user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(user.id)}
                        disabled={isAdding}
                      >
                        {isAdding ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Update Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader onClose={() => setIsRoleDialogOpen(false)}>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedMember?.username}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role-select" className="text-sm font-medium mb-2 block">
                  Role
                </Label>
                <Select
                  id="role-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as TripRole)}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                <p><strong>Admin:</strong> Can edit trip and manage members</p>
                <p><strong>Member:</strong> Can add expenses and view trip</p>
                <p><strong>Viewer:</strong> Can only view trip details</p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isUpdatingRole}>
              {isUpdatingRole ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader onClose={() => setIsDeleteDialogOpen(false)}>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the trip?
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {memberToDelete && (
              <p className="text-sm text-gray-600">
                Member: <strong>{memberToDelete.full_name || memberToDelete.username}</strong>
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isDeleting}>
              {isDeleting ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
