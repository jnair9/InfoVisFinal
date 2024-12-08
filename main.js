// Global function called when select element is changed
function onCategoryChanged() {
    var select = d3.select('#regionSelect').node();
    // Get current value of select element
    var category = select.options[select.selectedIndex].value;
    // Update chart with the selected category of temperatures
    updateChart(category);
}

// This function converts strings to numeric temperatures during data preprocessing
function dataPreprocessor(row) {
    return {
        region: row.Region,
        school: row.Name,
        students: +row['Undergrad Population'],
        white: +row['% White'],
        black: +row['% Black'],
        asian: +row['% Asian'],
        hispanic: +row['% Hispanic'],
        other: 1 - (+row['% White'] + +row['% Black'] + +row['% Asian'] + +row['% Hispanic'])
    };
}

var svg = d3.select('svg');

// Get layout parameters
var svgWidth = document.getElementById('chart-container').offsetWidth - 10;
var svgHeight = +svg.attr('height');
svg.attr('width', svgWidth);

var padding = {t: 60, r: 40, b: 60, l: 400};

// Compute chart dimensions
var chartWidth = svgWidth - padding.l - padding.r;
var chartHeight = svgHeight - padding.t - padding.b;

// Create a group element for appending chart elements
var chartG = svg.append('g')
    .attr('transform', 'translate('+[padding.l, padding.t]+')');

//Axis Setup
var xScale = d3.scaleLinear().range([0, chartWidth]);
var yScale = d3.scaleBand().range([0, chartHeight]).padding(0.1);
var xAxis = d3.axisBottom(xScale);
var yAxis = d3.axisLeft(yScale);

var xAxisGroup = chartG.append('g')
    .attr('class', 'x-axis')
    .attr('transform', 'translate(0,' + chartHeight + ')');

var yAxisGroup = chartG.append('g')
    .attr('class', 'y-axis');

svg.append('text')
    .attr('class', 'x-axis-title')
    .attr('x', svgWidth / 2)
    .attr('y', svgHeight - 10)
    .attr('text-anchor', 'middle')
    .text('Number of Students')
    .style('font-size', '25px')
    .style('font-weight', 'bold');

svg.append('text')
    .attr('class', 'y-axis-title')
    .attr('x', -(svgHeight / 2))
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .text('College Names')
    .style('font-size', '25px')
    .style('font-weight', 'bold');

d3.csv('Colleges.csv', dataPreprocessor).then(function(dataset) {
    var regions = Array.from(new Set(dataset.map(d => d.region).filter(region => region && region.trim() !== "")));

    var select = d3.select('#regionSelect');
    regions.forEach(region => {
        select.append('option')
            .attr('value', region)
            .text(region)
    })
    updateChart(regions[0])
});

//custom color scale for enter bars
var colorScale = d3.scaleOrdinal(d3.schemeCategory10);
var tooltip = d3.select("#tooltip");

function updateChart(selectedRegion) {
    // Create a filtered array of colleges based on the filterKey
    d3.csv('Colleges.csv', dataPreprocessor).then(function(dataset) {
        // **** Draw and Update your chart here ****
        var filteredRegions = dataset.filter(d => d.region === selectedRegion)

        //logic for chart height
        var barHeight = 30;
        var numColleges = filteredRegions.length;
        var newChartHeight = numColleges * barHeight;

        var newSVGHeight = newChartHeight + padding.t + padding.b;
        svg.attr('height', newSVGHeight);
        chartHeight = newChartHeight;
        yScale.range([0, chartHeight]);
        xAxisGroup.attr('transform', 'translate(0,' + chartHeight + ')');

        svg.select('.x-axis-title')
            .attr('x', svgWidth / 2)
            .attr('y', newSVGHeight - 10);

        svg.select('.y-axis-title')
            .attr('x', -(newSVGHeight / 2))
            .attr('y', 40);

        //updating the axis scales and axis
        xScale.domain([0, d3.max(filteredRegions, d => d.students)]);
        yScale.domain(filteredRegions.map(d => d.school));
        xAxisGroup.transition().duration(750).call(xAxis);
        yAxisGroup.transition().duration(750).call(yAxis);
  




        var bars = chartG.selectAll('.bar').data(filteredRegions, d => d.school);

        var enterBars = bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.school))
            .attr('height', yScale.bandwidth())
            .attr('width', 0)
            .style('fill', d => colorScale(d.school))
            .on('mouseover', function(event, d) {
                var white_percentage = (d.white * 100).toFixed(1) + '%';
                var black_percentage = (d.black * 100).toFixed(1) + '%';
                var asian_percentage = (d.asian * 100).toFixed(1) + '%';
                var hispanic_percentage = (d.hispanic * 100).toFixed(1) + '%';
                var other = (d.other * 100).toFixed(1) + '%';

                tooltip.style('opacity', 1)
                    .html(
                        `<strong>${d.school}</strong><br/>
                        White: ${white_percentage}<br/>
                        Black: ${black_percentage}<br/>
                        Asian: ${asian_percentage}<br/>
                        Hispanic: ${hispanic_percentage}<br/>
                        Other: ${other}<br/>`
                    )
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on('mousemove', function(event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on('mouseout', function() {
                tooltip.style("opacity", 0);
            })
            .on('click', function(event, d) {
                showPieChart(d);
            });
        bars.merge(enterBars).transition()
            .duration(750) 
            .attr('y', d => yScale(d.school))
            .attr('width', d => xScale(d.students));

        bars.exit()
            .transition()
            .duration(750) 
            .attr('width', 0)
            .remove()
    });
    
}
//function to display the pie chart when bar is clicked
function showPieChart(collegeData) {
    var data = [
        {race: 'White', percentage: collegeData.white},
        {race: 'Black', percentage: collegeData.black},
        {race: 'Asian', percentage: collegeData.asian},
        {race: 'Hispanic', percentage: collegeData.hispanic},
        {race: 'Other', percentage: collegeData.other}
    ];

    var pie = d3.pie().value(d => d.percentage);
    var pieData = pie(data);
    d3.select('#pieChartContainer').selectAll('svg').remove();
    //custom color scale for the pie chart
    var color = d3.scaleOrdinal(d3.schemeCategory10);
    var pieSVG = d3.select('#pieChartContainer').append('svg')
        .attr('width', 300)
        .attr('height', 300)
        .append('g')
        .attr('transform', 'translate(' + 300 / 2 + ',' + 300 / 2 + ')');
    
    var arc = d3.arc() 
        .innerRadius(0)
        .outerRadius(Math.min(300, 300) / 2);

    var arcs = pieSVG.selectAll('path').data(pieData)
        .enter()
        .append('path')
        .attr("stroke-width", 2)
        .each(function(d) { this._current = d; })
        .attr('d', arc)
        .attr("opacity", 0)
        .transition()
        .duration(1000)
        .attr("fill", d => color(d.data.race))
        .attrTween('d', function(d){
            var interp = d3.interpolate({startAngle: 0, endAngle: 0}, d);
            return function(t) {
                return arc(interp(t));
            };
        })
        .attr("opacity", 1);


    pieSVG.selectAll('text').data(pieData)
        .enter()
        .append('text')
        .attr( 'transform', d => 'translate(' + arc.centroid(d) + ')')
        .attr('text-anchor', 'middle')
        .style('font-size', 12)
        .style('fill', 'white')
        .text(d => d.data.race)
        .attr("opacity", 0)
        .transition()
        .delay(1000)
        .duration(500)
        .attr("opacity", 1);

    //legend for pie chart
    var legend = pieSVG.selectAll('.legend-items').data(pieData)
        .enter()
        .append('g')
        .attr('class', 'legend-items')
        .attr('transform', (d, i) => 'translate(160,' + (i * 22 - 100) + ')');

    legend.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => color(d.data.race))
        .attr('stroke', 'black');

    legend.append('text')
        .attr('x', 18 + 4)
        .attr('y', 18 - 4)
        .text(d => d.data.race);


    d3.select('#pieChartOverlay')
    .style('display', 'flex')
    .style("opacity", 0)
    .transition()
    .duration(500)
    .style("opacity", 1);
}
//X button logic 
d3.select('#closePieChart').on('click', function() {
    d3.select('#pieChartOverlay').style('display', 'none');
});


// Remember code outside of the data callback function will run before the data loads
