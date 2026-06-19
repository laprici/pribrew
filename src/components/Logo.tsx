import logoSvg from "@/assets/logo.svg?raw";

/**
 * Wordmark "Pribrew" como SVG vectorial inline, teñido con el acento del tema.
 *
 * El SVG usa fill="currentColor", así que sigue a --accent (via text-accent) en
 * claro/oscuro y se ve nítido a cualquier tamaño. Pasa la altura por className
 * (p.ej. h-10); el ancho lo da el viewBox.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Pribrew"
      className={`inline-flex items-center text-accent [&>svg]:h-full [&>svg]:w-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  );
}
