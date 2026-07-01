import { DashboardShell } from "@/components/layout/DashboardShell"

export function ComingSoonPage({
  features,
  title,
}: {
  features: string[]
  title: string
}) {
  return (
    <DashboardShell title={title}>
      <section className="grid min-h-[calc(100svh-10rem)] place-items-center">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-2xl font-semibold">{title} segera hadir</h1>
          <div className="mt-6 rounded-lg border bg-card p-5 text-left text-card-foreground">
            <h2 className="text-sm font-medium">Fitur dalam page ini:</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </DashboardShell>
  )
}
