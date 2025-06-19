type VerifyEmailPageProps = {
  searchParams: Promise<{
    token: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;
  const response = await fetch(
    process.env.NEXT_PUBLIC_API_URL + '/auth/verify-email',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    },
  );

  return (
    <>
      <h1>Vérification de l&apos;e-mail</h1>
      {response.status === 200 ? (
        <>
          <p>
            Votre e-mail a été vérifié avec succès. Vous pouvez maintenant vous
            connecter.
          </p>
          <a href="/app/sign-in">Se connecter</a>
        </>
      ) : (
        <p>La vérification de votre e-mail a échoué. Veuillez réessayer.</p>
      )}
    </>
  );
}
