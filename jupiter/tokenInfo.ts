import axios from 'axios';

export async function tokenInfo(symbol: string){
    try {
        const response = await axios.get('https://lite-api.jup.ag/tokens/v2/search', {
            params: { query: symbol }
        })

        return response.data
    } catch (error) {
        console.log(error)
    }
}