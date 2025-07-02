import ProfilePictureEditor from '@/components/profile-picture-editor';

export default function ProfileSettingsPage() {
  return (
    <>
      <h1 className="scroll-m-20 text-left text-4xl font-extrabold tracking-tight text-balance mb-4">
        Profile Settings
      </h1>
      <ProfilePictureEditor />
    </>
  );
}
