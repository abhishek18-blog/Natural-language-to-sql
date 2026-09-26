import { DatabaseSecurityPolicy, UserRole } from './types';

export const SAKILA_POLICY: DatabaseSecurityPolicy = {
  database: 'sakila',
  tables: {
    customer: {
      description: 'Customer profiles and personal information',
      allowedRoles: ['user', 'admin'],
      columns: {
        customer_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        store_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        first_name: { classification: 'PII_CRITICAL', description: 'Customer First Name', allowedRoles: ['admin'] },
        last_name: { classification: 'PII_CRITICAL', description: 'Customer Last Name', allowedRoles: ['admin'] },
        email: { classification: 'PII_CRITICAL', description: 'Customer Email Address', allowedRoles: ['admin'] },
        address_id: { classification: 'PII_CRITICAL', description: 'Reference to physical residence', allowedRoles: ['admin'] },
        active: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        create_date: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        last_update: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    address: {
      description: 'Physical addresses and telephone numbers',
      allowedRoles: ['admin'], // Standard users should not query address table directly
      columns: {
        address_id: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        address: { classification: 'PII_CRITICAL', description: 'Street Address', allowedRoles: ['admin'] },
        address2: { classification: 'PII_CRITICAL', description: 'Secondary Address', allowedRoles: ['admin'] },
        district: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        city_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        postal_code: { classification: 'PII_CRITICAL', description: 'Postal Code', allowedRoles: ['admin'] },
        phone: { classification: 'PII_CRITICAL', description: 'Telephone Number', allowedRoles: ['admin'] },
        last_update: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    staff: {
      description: 'Store employee credentials and records',
      allowedRoles: ['admin'],
      columns: {
        staff_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        first_name: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        last_name: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        address_id: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        picture: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        email: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        store_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        active: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        username: { classification: 'INTERNAL_CREDENTIAL', allowedRoles: ['admin'] },
        password: { classification: 'INTERNAL_CREDENTIAL', allowedRoles: [] }, // Never visible
        last_update: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    payment: {
      description: 'Financial transactions',
      allowedRoles: ['user', 'admin'],
      columns: {
        payment_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        customer_id: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        staff_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        rental_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        amount: { classification: 'FINANCIAL_RESTRICTED', allowedRoles: ['user', 'admin'], allowAggregateOnlyForUser: true },
        payment_date: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        last_update: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    film: {
      description: 'Catalog films, descriptions, ratings',
      allowedRoles: ['user', 'admin'],
      columns: {
        film_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        title: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        description: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        release_year: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        language_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        original_language_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        rental_duration: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        rental_rate: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        length: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        replacement_cost: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        rating: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        special_features: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        last_update: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    actor: {
      description: 'Film actors (public figures, not customers)',
      allowedRoles: ['user', 'admin'],
      columns: {
        actor_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        first_name: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        last_name: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        last_update: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    rental: {
      description: 'Rental transactions',
      allowedRoles: ['user', 'admin'],
      columns: {
        rental_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        rental_date: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        inventory_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        customer_id: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        return_date: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        staff_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        last_update: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
  },
};

export const AIRPORTDB_POLICY: DatabaseSecurityPolicy = {
  database: 'airportdb',
  tables: {
    passenger: {
      description: 'Passenger identity and passport information',
      allowedRoles: ['user', 'admin'],
      columns: {
        passenger_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        firstname: { classification: 'PII_CRITICAL', description: 'Passenger First Name', allowedRoles: ['admin'] },
        lastname: { classification: 'PII_CRITICAL', description: 'Passenger Last Name', allowedRoles: ['admin'] },
        passportno: { classification: 'PII_CRITICAL', description: 'Government Passport Number', allowedRoles: ['admin'] },
      },
    },
    passengerdetails: {
      description: 'Passenger private contact details, birthdate, sex, residence',
      allowedRoles: ['admin'], // Entire table restricted for user role
      columns: {
        passenger_id: { classification: 'PII_CRITICAL', allowedRoles: ['admin'] },
        birthdate: { classification: 'PII_CRITICAL', description: 'Date of Birth', allowedRoles: ['admin'] },
        sex: { classification: 'PII_CRITICAL', description: 'Biological Sex', allowedRoles: ['admin'] },
        street: { classification: 'PII_CRITICAL', description: 'Street Address', allowedRoles: ['admin'] },
        city: { classification: 'PII_CRITICAL', description: 'City of Residence', allowedRoles: ['admin'] },
        zip: { classification: 'PII_CRITICAL', description: 'Postal Code', allowedRoles: ['admin'] },
        country: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        emailaddress: { classification: 'PII_CRITICAL', description: 'Email Address', allowedRoles: ['admin'] },
        telephoneno: { classification: 'PII_CRITICAL', description: 'Phone Number', allowedRoles: ['admin'] },
      },
    },
    booking: {
      description: 'Flight booking records and ticket pricing',
      allowedRoles: ['user', 'admin'],
      columns: {
        booking_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        booking_platform: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        price: { classification: 'FINANCIAL_RESTRICTED', allowedRoles: ['user', 'admin'] },
      },
    },
    flight: {
      description: 'Flight schedules, routes, and statuses',
      allowedRoles: ['user', 'admin'],
      columns: {
        flight_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        flightno: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        from: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        to: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        departure: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        arrival: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        airline_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        airplane_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    airport: {
      description: 'Airport facilities, codes, and geographic locations',
      allowedRoles: ['user', 'admin'],
      columns: {
        airport_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        iaracode: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        icao: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        name: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        city: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        country: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    airline: {
      description: 'Airlines and operating carriers',
      allowedRoles: ['user', 'admin'],
      columns: {
        airline_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        airlinename: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        iaracode: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        icao: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        base_airport: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
    airplane: {
      description: 'Airplanes, models, and capacity',
      allowedRoles: ['user', 'admin'],
      columns: {
        airplane_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        capacity: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        type_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
        airline_id: { classification: 'PUBLIC', allowedRoles: ['user', 'admin'] },
      },
    },
  },
};

export function getSecurityPolicy(database?: string): DatabaseSecurityPolicy {
  if (database === 'airportdb') return AIRPORTDB_POLICY;
  return SAKILA_POLICY;
}
