import axios from 'axios';


type TokenPair = {
    token0: { symbol: string };
    token1: { symbol: string };
    id: string;
};

type QueryResult = {
    data: {
        pairs: TokenPair[];
    };
};

type FormattedPair = {
    text: string;
    value: string;
};

let cachedQueryResult: QueryResult | null = null;

async function fetchQueryResult(): Promise<QueryResult> {
    if (cachedQueryResult) {
        return cachedQueryResult;
    }

    const response = await axios.post('https://graph.vanillaswap.org/subgraphs/name/vanillalabs/vanillaswap', {
        query: `query queryPairs {
            pairs {
                token0 {symbol}
                token1 {symbol}
                id
            }
        }`,
        operationName: "queryPairs",
        extensions: {}
    });
    console.log(`read ${response.data.data.pairs.length} pool data.`);
    cachedQueryResult = response.data;
    return response.data;
}

export async function formatPairs(): Promise<FormattedPair[]> {
    const queryResult = await fetchQueryResult();
    return queryResult.data.pairs.map(pair => ({
        text: `${pair.token0.symbol}:${pair.token1.symbol}`,
        value: pair.id
    }));
}