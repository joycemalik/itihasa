export const handler = async (event) => {
    // 1. Security: Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Parse the email from the frontend
    let email;
    try {
        const body = JSON.parse(event.body);
        email = body.email;
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    if (!email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    try {
        // 3. Send data to Brevo (Add Contact to List)
        const response = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY, // Reads from your .env file
            },
            body: JSON.stringify({
                email: email,
                updateEnabled: true, // If they exist, update them instead of failing
                listIds: [2], // OPTIONAL: If you want them in a specific Brevo list, uncomment and add the ID
            }),
        });

        // 4. Handle Brevo's response
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Brevo Error:", errorData);
            return { statusCode: response.status, body: JSON.stringify({ error: "Subscription failed" }) };
        }

        // 5. Success!
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Seeker registered successfully.' }),
        };

    } catch (error) {
        console.error("Server Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
