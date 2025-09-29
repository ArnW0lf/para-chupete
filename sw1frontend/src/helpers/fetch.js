const baseUrl = process.env.REACT_APP_API_URL;


export const fetchSinToken = async ( endpoint, data, method = 'GET') => {
    const url = `${baseUrl}/${endpoint}`;


    if ( method === 'GET' ) {
        const resp = await fetch(url);
        return await resp.json();
    } else {
        const resp = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'  // ✅ Corrección aquí
            },
            body: JSON.stringify(data)
        });

        return await resp.json();
    }
};


export const fetchConnToken = async ( endpoint, data, method = 'GET') => {
    const url = `${baseUrl}/${endpoint}`;
    const token = localStorage.getItem('token') || '';

    if (method === 'GET') {
        const resp = await fetch(url,{
            headers:{
                'x-token': token
            }
        });
        return await resp.json();
    } else {
        const resp = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',  // ✅ Corrección aquí
                'x-token': token
            },
            body: JSON.stringify(data)
        });

        return await resp.json();
    }
};
