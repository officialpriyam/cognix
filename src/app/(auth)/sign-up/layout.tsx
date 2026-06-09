export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in duration-700 w-full h-full flex flex-col p-4 md:p-8 justify-center relative">
      <div className="flex flex-col gap-4 w-full md:max-w-md mx-auto">
        {children}
      </div>
    </div>
  );
}
