export interface CSVContact {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  address?: {
    country?: string;
    streetAddress?: string;
    apartment?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  description?: string;
}

export function parseCSVToContacts(csvText: string): CSVContact[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  const contacts: CSVContact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const contact: Partial<CSVContact & { address?: any }> = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';

      // Map CSV headers to contact fields
      switch (header) {
        case 'firstname':
        case 'first_name':
        case 'first name':
          contact.firstName = value;
          break;
        case 'lastname':
        case 'last_name':
        case 'last name':
          contact.lastName = value;
          break;
        case 'email':
        case 'email_address':
        case 'email address':
          contact.email = value;
          break;
        case 'phone':
        case 'phone_number':
        case 'phone number':
        case 'mobile':
          contact.phone = value;
          break;
        case 'company':
        case 'company_name':
        case 'company name':
        case 'organization':
          contact.companyName = value;
          break;
        case 'job_title':
        case 'job title':
        case 'title':
        case 'position':
          contact.jobTitle = value;
          break;
        case 'country':
          if (!contact.address) contact.address = {};
          contact.address.country = value;
          break;
        case 'street':
        case 'street_address':
        case 'street address':
        case 'address':
          if (!contact.address) contact.address = {};
          contact.address.streetAddress = value;
          break;
        case 'apartment':
        case 'suite':
        case 'unit':
          if (!contact.address) contact.address = {};
          contact.address.apartment = value;
          break;
        case 'city':
          if (!contact.address) contact.address = {};
          contact.address.city = value;
          break;
        case 'state':
        case 'province':
        case 'region':
          if (!contact.address) contact.address = {};
          contact.address.state = value;
          break;
        case 'zip':
        case 'zipcode':
        case 'zip_code':
        case 'postal_code':
        case 'postal code':
          if (!contact.address) contact.address = {};
          contact.address.zipCode = value;
          break;
        case 'description':
        case 'notes':
        case 'comments':
          contact.description = value;
          break;
      }
    });

    // Validate required fields and cast
    if (contact.firstName && contact.lastName && contact.email) {
      contacts.push(contact as CSVContact);
    }
  }

  return contacts;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateCSVTemplate(): string {
  return `firstName,lastName,email,phone,companyName,jobTitle,country,streetAddress,apartment,city,state,zipCode,description
John,Doe,john.doe@example.com,+1234567890,Acme Corp,Software Engineer,US,123 Main St,Apt 1,New York,NY,10001,Sample contact
Jane,Smith,jane.smith@example.com,+0987654321,Tech Solutions,Project Manager,US,456 Oak Ave,,Los Angeles,CA,90210,Another sample contact
Mike,Johnson,mike.johnson@example.com,+1122334455,StartupXYZ,CEO,US,789 Pine Rd,Suite 200,Chicago,IL,60601,Startup founder
Sarah,Wilson,sarah.wilson@example.com,+5566778899,Design Studio,Creative Director,US,321 Elm St,,Miami,FL,33101,Creative professional`;
}