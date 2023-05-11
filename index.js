const https = require('https');
const fs = require('fs');
const { StringDecoder } = require('string_decoder');
const express = require('express');

const application = express();

application.use('/public', express.static('public'));
application.set('views');

application.get('/', (req,res)=>{
    res.render('request.ejs')
});

let url;

application.get('/Search', (req,res)=>{
    var query = req.query.queryString;


    function searchQuery(input=query){
        let x = []
        for(let i = 0; i < input.length; i++){
    
            if(input[i] == ' '){
                x.push('_')
            }
            else{
                x.push(input[i])
            }
        }
    
        let query = x.join('');
    
        let url = `https://en.m.wikipedia.org/wiki/${query}`
    
        return url;
    }
    
    url = searchQuery();

    res.redirect(`/query`)
})

application.listen(3000, (error)=>{
    console.log('listening on port 3000')
    if (error) throw error;
});

application.get('/query', (req,res)=>{
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
                        if(linkStringCollector[i].length <= 3){
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
    
                count = count - 2;
    
                let titlesPool = rawTextData;
                let sectionTitles = [];
                let subSectionTitlesCollection = []
                let subSectionTitles = [];
                let sectionTexts = [];
                
    
                for(let i = 0; i < count; i++){
                    // collect section titles
                    let sectionTitleStart = titlesPool.indexOf('section-heading');
                    titlesPool = titlesPool.substring(sectionTitleStart);
                    let sectionTitleEnd = titlesPool.indexOf('</span>');
    
                    let sectionTitle = titlesPool.substring(0, sectionTitleEnd)
                    
    
                    let start = sectionTitle.indexOf('<span class="mw-headline"');
    
                    sectionTitle = sectionTitle.substring(start)
                    sectionTitle = sectionTitle.substring(sectionTitle.indexOf('>'))
    
                    sectionTitles.push(sectionTitle);
    
                    titlesPool = titlesPool.substring(titlesPool.indexOf(`${sectionTitle}`))
    
    
                    // collect section contents // If first section = no title
                    // 1. grab text section
                    let sectionTextStart = rawTextData.indexOf(`mf-section-${i}`);
    
                    let currentSection = i;
    
                    let sectionText0;
    
                    if(i == 0){
                        rawTextData = rawTextData.substring(sectionTextStart);
                        let sectionTextEnd = rawTextData.indexOf('</section>');
                        let rawText = rawTextData.substring(0, sectionTextEnd);
                        
                        // Filter text
                        rawText = rawText.substring(rawText.indexOf('<p>'), rawText.indexOf('class="toc"'));
                        rawText = rawText.split(`<b>`).join('');
                        rawText = rawText.split(`</b>`).join('');
    
                        let cleanText = '';
                        let searchOn = true;
    
                        function cleanTag(){
                            
                            while(searchOn){
                                let start = rawText.indexOf('>');
    
                                if(start == -1){
                                    searchOn = false
                                }
                                else{
                                    rawText = rawText.substring(start);
                                    let end = rawText.indexOf('<');
    
                                    let tempText = rawText.substring(1, end);
    
                                    cleanText = cleanText + tempText;
    
                                    rawText = rawText.substring(end+1);
                                }
    
                            }
                            return cleanText;
                        }
    
                        sectionText0 = cleanTag();
                        sectionTexts.push([0,sectionText0]);
    
                    }
    
                    if(i > 0){
                        // SAME FOR THE OTHER SECTIONS 
                        // FIRST GET ALL SUB-TITLES THEN THE TEXT
                        rawTextData = rawTextData.substring(sectionTextStart);
                        let sectionTextEnd = rawTextData.indexOf('</section>');
                        let rawText = rawTextData.substring(0, sectionTextEnd);
    
                        let subTitlePool = rawText;
    
                        // calc amount of sub titles => // 
                        let sectionOccurs = '<h3>'
                        let count = 0
                        let searching = true
    
                        while(searching){
                            if(subTitlePool.includes(sectionOccurs)){
                                count = count + 1;
                                subTitlePool = subTitlePool.substring(subTitlePool.indexOf(sectionOccurs)+1);
                            }
                            else{
                                searching = false
                            }
                        }
    
                        subTitlePool = rawText;
    
                        let startSubTitle;
                        let endSubtitle;
    
                        // grab sub titles
                        for(let i = 0; i <= count; i++){
                            startSubTitle = subTitlePool.indexOf(`<h3>`);
                            endSubtitle = subTitlePool.indexOf('</h3>')+5;
                            let subString = subTitlePool.substring(startSubTitle, endSubtitle);
    
                            startSubTitle = subString.indexOf(`<span`);
                            endSubtitle = subString.indexOf(`</span>`)+7;
                            subString = subString.substring(startSubTitle, endSubtitle);
    
                            startSubTitle = subString.indexOf('">');
                            endSubtitle = subString.indexOf('</');
                            subString = subString.substring(startSubTitle+1, endSubtitle);
    
                            let subTitle = subString;
    
    
                            if(subTitle.length > 0){
                                if(subTitle != '\n'){
                                    subSectionTitles.push([currentSection, subTitle]);
                                }
                                
                            }
    
                            subTitlePool = subTitlePool.substring(subTitlePool.indexOf('</h3>')+5)
    
                        }
                    }
                }
    
                rawTextData = mainData[2];
    
    
                // text sections
                for(let i = 1; i < count; i++){
                    // grab sub texts
    
                    let sectionTextStart = rawTextData.indexOf(`mf-section-${i}`);
                    rawTextData = rawTextData.substring(sectionTextStart);
    
                    let sectionTextEnd = rawTextData.indexOf('</section>');
                    rawText = rawTextData.substring(0, sectionTextEnd);
    
                    rawText = rawText.substring(rawText.indexOf('<p>'));
    
                    let cleanText = '';
                    let searchOn = true;
    
                    function cleanTag(){
                        
                        while(searchOn){
                            let start = rawText.indexOf('>');
    
                            if(start == -1){
                                searchOn = false
                            }
                            else{
                                rawText = rawText.substring(start);
                                let end = rawText.indexOf('<');
    
                                if(end == -1){
                                    searchOn = false
                                }
    
                                let tempText = rawText.substring(1, end);
    
                                cleanText = cleanText + tempText;
    
                                rawText = rawText.substring(end+1);
                            }
    
                        }
                        return cleanText;
                    }
    
                    let tempText = cleanTag();
                    sectionTexts.push([i, tempText]);
                }
    
                subSectionTitlesCollection.push(subSectionTitles)
    
                let result = [sectionTitles, sectionTexts, subSectionTitlesCollection];
                return result
    
            }
    
            const bioData = filterBio();
            const mainTextData = filterTextSection();
    
    
            // json object 
            let jsonObject = {
                header: {
                    headTitle: mainTitle,
                },
                bioBox: {
                    imageLink: bioData[0],
                    imageCaption: bioData[1],
                    labels: bioData[2],
                    links: bioData[2][1]
                },
                body: {
                    subTitle: mainTextData[0],
                    textSubtitles : mainTextData[2],
                    textSections : mainTextData[1]
                }
            }
    
            // DATA --> JSON FILE
            fs.writeFileSync('data.json', JSON.stringify(jsonObject, null, 2));
    
    
            fs.writeFile('data.txt', mainData[1], (err)=>{
                if(err)throw err;
            });
        });
    
    }).on('error', (error)=>{
        console.error(error)
    });
})

