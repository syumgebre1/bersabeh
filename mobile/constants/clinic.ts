/**
 * Bersabeh Clinic — mobile-side clinic information.
 * MIRROR of backend/app/core/clinic_config.py.
 */

export interface ClinicInfo {
  name: string;
  tagline: string;
  city: string;
  neighborhood: string;
  fullAddress: string;
  landmark: string;
  yearsOperating: number;
  emergencyPhone: string;
  receptionPhone: string;
  email: string;
  licenseNumber: string;
  workingHours: string;
  parkingNote: string;
}

export const CLINIC: ClinicInfo = {
  name: 'Bersabeh Clinic',
  tagline: 'Trusted care for Addis Ababa since 2009',
  city: 'Addis Ababa',
  neighborhood: 'Bole',
  fullAddress: 'Bole Road, near Getu Commercial Center, Addis Ababa, Ethiopia',
  landmark: 'Opposite Getu Commercial Center, 2nd floor',
  yearsOperating: 16,
  emergencyPhone: '+251 11 555 0199',
  receptionPhone: '+251 11 555 0177',
  email: 'info@bersabehclinic.com',
  licenseNumber: 'MoH/AA/CL/2009/0421',
  workingHours: 'Mon–Sat 08:00–20:00 · Sun 09:00–13:00',
  parkingNote: 'Street parking available; paid lot next door at Getu Center.',
};