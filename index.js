const https = require('https');
const fs = require('fs');
const { StringDecoder } = require('string_decoder');

const url = 'https://en.m.wikipedia.org/wiki/Nobel_Prize_in_Physics';

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

        // GET TAGS 
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


            dataCollection = [mainData, rawBio]
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
                console.log(imageLink)
            }
            if(start === -1){
                console.log('No image found')
            }

            // Image caption
            start = bio.indexOf(`infobox-caption`);
            if(start != -1){
                let imageCaption = bio.substring(start);
                start = imageCaption.indexOf(`>`);
                end = imageCaption.indexOf('<');
                test = imageCaption.substring(start+1,end);
                imageCaption = test;
                console.log(imageCaption)
            }
            if(start === -1){
                console.log('No image caption found.')
            }

            // infobox header(s)
            

            // infobox label(s)

            
            // infobox link(s)
        }

        filterBio()

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