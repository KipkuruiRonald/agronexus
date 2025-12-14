# UI Field Names Extracted from Frontend

## Authentication Modal (src/components/AuthModal.tsx)

### Login Form Fields:
- `email` - User email address
- `password` - User password

### Registration Form Fields:
- `username` - Unique username
- `email` - User email address
- `password` - User password
- `confirmPassword` - Password confirmation
- `first_name` - User's first name
- `last_name` - User's last name
- `farm_name` - Farm name (farmer-specific)
- `location` - Farm/location (farmer-specific)
- `user_type` - User type selection (buyer/farmer)

## Checkout Page (src/pages/Checkout.tsx)

### Checkout Form Fields:
- `delivery_address` - Delivery address for orders
- `delivery_notes` - Special delivery instructions
- `phone_number` - Phone number for M-Pesa payments

## Cart Page (src/pages/Cart.tsx)

### Cart Item Fields (Display Only):
- `id` - Item identifier
- `name` - Product name
- `price` - Product price
- `quantity` - Item quantity
- `image` - Product image
- `farmer` - Farmer name
- `unit` - Product unit (kg, pieces, etc.)

## Summary of All UI Input Fields:

### Text Input Fields:
- email
- password
- username
- first_name
- last_name
- farm_name
- location
- delivery_address
- delivery_notes
- phone_number

### Password Fields:
- password
- confirmPassword

### Selection/Choice Fields:
- user_type (buyer/farmer)

### Numeric Fields:
- quantity (for cart operations)

## Notes:
- Most fields are required for registration
- Some fields are conditionally required (farm_name, location for farmers)
- Email and password are required for login
- Phone number is required for M-Pesa payments
- Delivery address and notes are for order fulfillment

