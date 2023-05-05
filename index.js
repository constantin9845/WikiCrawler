const https = require('https');
const fs = require('fs');
const { StringDecoder } = require('string_decoder');
const { count } = require('console');
const { title } = require('process');

const url = 'https://en.m.wikipedia.org/wiki/Bigfoot';

https.get(url, (response)=>{
    let data = '';

    const decoder = new StringDecoder('utf-8');

    response.on('data', (chunk)=>{
        data += decoder.write(chunk);
    });

    response.on('end', ()=>{
        //console.log(data);

        // wikipedia pages
        // REMOVE UNWANTED DATA - KEEP BODY TAG ONLY
        function deleteData(openingTag, closingTag){
            const start = data.indexOf(openingTag);
            const end = data.indexOf(closingTag);


            // check if tag was found
            if(start === -1){
                console.log(`'${openingTag}' Tag was not found.`);
                return;
            }
            if(end === -1){
                console.log(`'${closingTag}' Tag was not found.`);
                return;
            }

            data = data.substring(start, end)
        }
        deleteData('<body','</body>');

        // GET WORK CONTENT 
        function locateParticle(particleStart, particleEnd){
            const start = data.indexOf(particleStart);
            const end = data.indexOf(particleEnd);

            // check if particle was found
            if(start === -1){
                console.log(`'${particleStart}' Tag was not found.`);
                return;
            }
            if(end === -1){
                console.log(`'${particleEnd}' Tag was not found.`);
                return;
            }

            let rawParticle = data.substring(start,end);
            return rawParticle;
        };

        // Filter raw main title data --> Single title string
        function FilterMainTitle(){
            let mainTitle = locateParticle('<h1 ','</h1>');

            let start = mainTitle.indexOf('<span');
            let end = mainTitle.indexOf('</span>');

            mainTitle = mainTitle.substring(start,end);
            start = mainTitle.indexOf('>');

            mainTitle = mainTitle.substring(start+1);

            return mainTitle;
        };

        // extract main data
        function FilterMainData(){
            let mainData = locateParticle(`id="mw-content-text"`, `class="printfooter"`);

            // get biography infobox
            let bioStart = mainData.indexOf('<table class="infobox');
            let bioEnd = mainData.indexOf('</table>');
            let rawBio = mainData.substring(bioStart, bioEnd)

            // get all main text containers into 1
            let rawTextContainer = mainData.substring(mainData.indexOf(`mw-parser-output`));


            dataCollection = [mainData, rawBio, rawTextContainer]
            return dataCollection;
        }

        const mainTitle = FilterMainTitle();
        const mainData = FilterMainData();

        function filterBio(){
            let bio = mainData[1];

            // Image link
            let start = bio.indexOf('src="')
            if(start != -1){
                imageLink = bio.substring(start+5)
                end = imageLink.indexOf(`jpg"`)
                
                // check if png or jpg
                if(end === -1){
                    end = imageLink.indexOf(`png"`)
                }

                imageLink = imageLink.substring(0,end+3)
            }
            if(start === -1){
                console.log('No image found')
            }

            // Image caption
            start = bio.indexOf(`infobox-caption`);
            if(start != -1){
                imageCaption = bio.substring(start);

                // check if any links present in string - delete <a> tag
                if(imageCaption.includes(`<a`)){
                    firstLink = imageCaption.indexOf(`<a`);
                    temp = imageCaption.substring(firstLink)
                    firstLinkEnd = temp.indexOf(`>`);
                    firstLink = temp.substring(0,firstLinkEnd+1)

                    imageCaption = imageCaption.replace(firstLink,'');
                    imageCaption = imageCaption.replace(`</a>`, '');

                }
                start = imageCaption.indexOf(`>`);
                end = imageCaption.indexOf('<');
                imageCaption = imageCaption.substring(start+1,end);
            }
            if(start === -1){
                console.log('No image caption found.')
                imageCaption = undefined;
            }

            // infobox label(s) + infobox link(s)
            // as json object -> {label : link}, stored in 1 shared json object -> { {label : link}, {label : link},... }
            let infoBoxesLeft = true;
            let bioLabels = bio.substring(bio.indexOf(`infobox-label`));
            let labels_links = {
                "labels": [],
                "links": []
            }


            while(infoBoxesLeft){

                // grab label
                let label = bioLabels.substring(bioLabels.indexOf('>')+1,bioLabels.indexOf('<'))
                bioLabels = bioLabels.substring(bioLabels.indexOf('<'));

                // grab link
                let link = bioLabels.substring(bioLabels.indexOf(`infobox-data`), bioLabels.indexOf(`</td>`)+1);


                // filter link
                let linkFilter = true
                let linkStringCollector = [];

                while(linkFilter){
                    // check if data left in link
                    if(link.includes('<')){

                        let linkItem = link.substring(link.indexOf(`>`)+1, link.indexOf(`<`));
                        linkStringCollector.push(linkItem)
                        link = link.substring(link.indexOf(`<`)+1)
                    }
                    else{
                        linkFilter = false;
                    };
                    
                };

                let i = linkStringCollector.length-1;
                while(i >= 0){
                    if(linkStringCollector[i].length <= 1){
                        linkStringCollector.splice(i, 1)
                    }
                    i = i - 1;
                }

                labels_links.labels.push(label);
                labels_links.links.push(linkStringCollector)

                // FIGURE LOOP TO GET ALL BIO BOXES 
                bioLabels = bioLabels.substring(bioLabels.indexOf('infobox-label'));
                infoBoxesLeft = false;

                if(bioLabels.includes('infobox-label')){
                    infoBoxesLeft = true;
                }
                else{
                    infoBoxesLeft = false;
                }

                
            }

            let result = [imageLink, imageCaption, labels_links];
            return result
        }

        function filterTextSection(){
            let rawTextData = mainData[2]

            // calc amount of sections => // Do not use last section => external links
            let temp = rawTextData;
            let sectionOccurs = '<section'
            let count = 0
            let searching = true

            while(searching){
                if(temp.includes(sectionOccurs)){
                    count = count + 1;
                    temp = temp.substring(temp.indexOf(sectionOccurs)+1);
                }
                else{
                    searching = false
                }
            }

            count = count - 2
            console.log(count)

            let titlesPool = rawTextData;
            

            // If first section = no title
            for(let i = 0; i < count; i++){
                // collect section titles
                let sectionTitleStart = titlesPool.indexOf('section-heading');
                titlesPool = titlesPool.substring(sectionTitleStart);
                let sectionTitleEnd = titlesPool.indexOf('</span>');

                let sectionTitle = titlesPool.substring(0, sectionTitleEnd)
                

                let start = sectionTitle.indexOf('<span class="mw-headline"');

                sectionTitle = sectionTitle.substring(start)
                sectionTitle = sectionTitle.substring(sectionTitle.indexOf('>'))

                console.log(sectionTitle)

                titlesPool = titlesPool.substring(titlesPool.indexOf(`${sectionTitle}`))

                // collect section contents
            }

        }

        const bioData = filterBio();
        filterTextSection()

        // json object 
        let jsonObject = {
            header: {
                headTitle: mainTitle,
            }
        }

        // DATA --> JSON FILE
        fs.writeFileSync('data.json', JSON.stringify(jsonObject));


        fs.writeFile('data.txt', mainData[1], (err)=>{
            if(err)throw err;
        });
    });

}).on('error', (error)=>{
    console.error(error)
});