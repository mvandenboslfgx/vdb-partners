import {
  isRc2ConcurrencyErrorCode,
  type Rc2ConcurrencyErrorCode,
} from "@/lib/contract/pin";

export type PartnerPortalErrorCode =
  | Rc2ConcurrencyErrorCode
  | "AUTH_REQUIRED"
  | "AUTH_NO_ACCESS"
  | "FORBIDDEN"
  | "IDENTITY_INCOMPLETE"
  | "IDENTITY_LOOKUP_FAILED"
  | "CONTRACT_SURFACE_UNAVAILABLE";

export class PartnerPortalError extends Error {
  readonly code: PartnerPortalErrorCode;

  constructor(code: PartnerPortalErrorCode, message: string) {
    super(message);
    this.name = "PartnerPortalError";
    this.code = code;
  }
}

export function mapBackendErrorMessage(
  message: string | null | undefined,
): PartnerPortalErrorCode | null {
  if (!message) return null;
  if (isRc2ConcurrencyErrorCode(message)) return message;
  if (message.includes("PARTNER_LEAD_ALREADY_CONVERTED"))
    return "PARTNER_LEAD_ALREADY_CONVERTED";
  if (message.includes("PARTNER_INSUFFICIENT_LIABILITY"))
    return "PARTNER_INSUFFICIENT_LIABILITY";
  return null;
}

export function userMessageForPartnerError(
  code: PartnerPortalErrorCode,
): string {
  switch (code) {
    case "PARTNER_LEAD_ALREADY_CONVERTED":
      return "Deze lead is al omgezet. Vernieuw de pagina en kies een andere lead.";
    case "PARTNER_INSUFFICIENT_LIABILITY":
      return "Onvoldoende beschikbare commissiesaldo voor deze uitbetaling.";
    case "AUTH_REQUIRED":
      return "U moet opnieuw inloggen.";
    case "AUTH_NO_ACCESS":
    case "FORBIDDEN":
      return "U heeft geen toegang tot dit onderdeel.";
    case "IDENTITY_INCOMPLETE":
      return "Uw account heeft nog geen volledige partner- of staffstatus.";
    case "IDENTITY_LOOKUP_FAILED":
      return "Kon uw accountstatus niet laden. Probeer het later opnieuw.";
    case "CONTRACT_SURFACE_UNAVAILABLE":
      return "Deze functie is niet beschikbaar op de huidige backendversie.";
    default:
      return "Er is een gecontroleerde fout opgetreden.";
  }
}
