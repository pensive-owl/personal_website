// Function to fetch champ data from data dragon
async function fetchChampionData() {
    try {
        // HTTP GET request to the Data Dragon API endpoint
        const response = await axios.get('https://ddragon.leagueoflegends.com/cdn/14.8.1/data/en_US/champion.json');

        // Extract champ data from response
        
        const champions = response.data.data;
        
        // console.log(champions)
        
        // Process each champion
        // for (const championId in champions) {
        //     const champion = champions[championId];        
        //     const championName = champion.name;
        //     const championIconUrl = `https://ddragon.leagueoflegends.com/cdn/11.7.1/img/champion/${champion.image.full}`;


        //     // 
        //     console.log(`Champion Name: ${champion.name}`);
        //     console.log(`Champion Icon URL: ${championIconUrl}`);
        // }

        // Process each champion version 2
        const champArray = Object.values(champions); 
        console.log(champArray);
        const champsWithIcons = champArray.map(champ => {
            return {
                champ: champ.id,
                champName: champ.name,
                champIconUrl: `https://ddragon.leagueoflegends.com/cdn/11.7.1/img/champion/${champ.image.full}`,
            }
        });
        console.log(champsWithIcons);
        
    } catch (error) {
    console.error('Error fetching champion data', error.message);
    }
}

fetchChampionData();


