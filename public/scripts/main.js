const searchRequest = document.querySelector('#search-btn');

searchRequest.addEventListener('click', function(e){
    e.preventDefault()
    let searchQuery = document.querySelector('#info').value;
    alert(searchQuery)
    $.ajax({
        url: '/Search',
        type: 'GET',
        data: {queryString : searchQuery},
    
        success: function(data){
            alert('Success', `${searchQuery}`)
        },
        error: function(request, status, error){
            console.log(request.responseText)
        }
    });
})

