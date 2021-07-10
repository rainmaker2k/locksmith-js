const prompts = require('prompts');

(async () => {
    const response = await prompts({
        type: 'autocomplete',
        name: 'value',
        message: 'Pick a color',
        choices: [
            { title: 'Red', description: 'This option has a description', value: '#ff0000' },
            { title: 'Green', value: '#00ff00'},
            { title: 'Blue', value: '#0000ff' },
            { title: 'Blue 1', value: '#0000ee' },
            { title: 'Blue 2', value: '#0000dd' },
            { title: 'Blue 3', value: '#0000cc' },
            { title: 'Blue 4', value: '#0000bb' },
            { title: 'Green2', value: '#00ee00' },
            { title: 'BlueG', value: '#00ddff' },
            { title: 'BlueD', value: '#00ccee' },
            { title: 'BlueE', value: '#00ffdd' },
            { title: 'BlueF', value: '#00aacc' },
            { title: 'Blue', value: '#00ffbb' },

        ],
        initial: 1
    });

    console.log(response.value);
})();