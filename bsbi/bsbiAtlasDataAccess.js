// These are data access functions required for the BSBI online Atlas designed to be used in conjunction with
// the BRC Atlat Javascript library ().

// CSV access functions designed to be used with data in the general format indicated below.
//"hectad","to 1929","1930 - 1949","1950 - 1969","1970 - 1986","1987 - 1999","2000 - 2009","2010 - 2019","atlasstatus"
//"SE84",1,0,0,0,0,0,0,

function getCSV(identifier) {
  //return 'work/nbn/' + identifier + ' hectads with tetrads-2020-05-29.csv'
  return './work/atlas_taxa_2020_08_25/hectad-dateclass-status/' + identifier.replace(".", "_") + '.csv'
}
function change_1987_1999_vs_2000_2019(identifier){
  return change(identifier, ['1987 - 1999'], ['2000 - 2009', '2010 - 2019'], 'Change from 1987-1999 to 2000-2019')   
}
function change_1930_1969_vs_2000_2019(identifier) {
  return change(identifier, ['1930 - 1949','1950 - 1969'], ['2000 - 2009', '2010 - 2019'], 'Change from 1930-1969 to 2000-2019')  
}
function change(identifier, early, late, legendTitle){
  const shapes=['square', 'triangle-up', 'triangle-down']
  const colours=['#FAD0C8', '#DD5A2F', '#525252']
  return new Promise((resolve, reject) => {
    d3.csv(getCSV(identifier), function(r) {
      const presentEarly = early.some(f => r[f] === '1')
      const presentLate = late.some(f => r[f] === '1')
      let i
      if (presentEarly && presentLate) {
        i = 0 //present
      } else if (!presentEarly && presentLate) {
        i = 1 //gain
      } else if (presentEarly && !presentLate) {
        i = 2 //loss
      } else {
        i = 100 //not present in either period
      }
      if (r.hectad && i < 100) {
        return({
          gr: r.hectad,
          colour: colours[i],
          shape: shapes[i],
        })
      }
    }).then(function(data) {
      resolve({
        records: data,
        size: 1,
        precision: 10000,
        opacity: 0.9,
        legend: {
          title: legendTitle,
          lines: [
            {
              colour: '#DD5A2F',
              text: 'Gain',
              shape: 'triangle-up',
            },
            {
              colour: '#FAD0C8',
              text: 'No change',
              shape: 'square',
            },
            {
              colour: '#525252',
              text: 'Loss',
              shape: 'triangle-down',
            }
          ]
        }
      })
    }).catch(function(e){
      reject(e)
    })
  })
}
function bsbiHectadDateClassesNewest(identifier) {
  return bsbiHectadDateClasses(identifier, true, 'Date classes (newest on top)')
}
function bsbiHectadDateClassesOldest(identifier) {
  return bsbiHectadDateClasses(identifier, false, 'Date classes (oldest on top)')
}
function bsbiHectadDateClasses(identifier, newestOnTop, legendTitle) {
  let colours = ["#FEF4E4", "#FEE1BB","#FECFA9","#FDAF8A","#EB8070","#CA4C4C", "#F34C4C"]
  let dateClassCols=["to 1929","1930 - 1949","1950 - 1969","1970 - 1986","1987 - 1999","2000 - 2009","2010 - 2019"]
  if (newestOnTop) {
    dateClassCols = dateClassCols.reverse()
    colours = colours.reverse()
  }
  return new Promise((resolve, reject) => {
    d3.csv(getCSV(identifier), function(r) {
      if (r.hectad) {
        let colour
        for (let i=0; i<dateClassCols.length; i++){
          if (Number(r[dateClassCols[i]])) {
            colour=colours[i]
            break
          }
        }
        if (!colour){
          // No categories were specified for hectad
          // indicate this missing data with black dot
          colour='magenta'
        }
        return({
          gr: r.hectad,
          colour: colour,
        })
      }
    }).then(function(data) {
      resolve({
        records: data,
        size: 1,
        shape: 'circle',
        precision: 10000,
        opacity: 0.9,
        legend: {
          title: legendTitle,
          lines: [
            {
              colour: '#FEF4E4',
              text: 'Before 1930',
            },
            {
              colour: '#FEE1BB',
              text: '1930-1949',
            },
            {
              colour: '#FECFA9',
              text: '1950-1969',
            },
            {
              colour: '#FDAF8A',
              text: '1970-1986',
            },
            {
              colour: '#EB8070',
              text: '1987-1999',
            },
            {
              colour: '#CA4C4C',
              text: '2000-2009',
            },
            {
              colour: '#F34C4C',
              text: '2010-2019',
            },
          ]
        }
      })
    }).catch(function(e){
      reject(e)
    })
  })
}
function nativeSpeciesStatus(identifier) {
  //Native (n)
  //Alien (a)
  //Present (y) - I'm not sure if this should be labelled as 'present' or 'native or alien' (not intermediate) 
  //Reintroduced (w) - this will be very rarely used
  //There may also be Casual (c) or that might be treated as Present or Native - I'll check with Kevin
  const colours={
    missing: '#F2CC35', //no value yet
    n: 'blue', //native
    a: 'red', //non-native (alien),
    y: 'grey',
    w: 'blue',
    bullseye: 'red'
  }
  return new Promise((resolve, reject) => {
    d3.csv(getCSV(identifier), function(r) {
      if (r.hectad) {
        const atlasstatus = r.atlasstatus ? r.atlasstatus : 'missing'
        //const atlasstatus = r.atlasstatus ? r.atlasstatus : 'w'
        return({
          gr: r.hectad,
          shape: atlasstatus === "w" ? 'bullseye' : 'circle',
          colour: colours[atlasstatus],
          colour2: colours.bullseye
        })
      }
    }).then(function(data) {
      // For any that are bullseye, create new blahs
      resolve({
        records: data,
        precision: 10000,
        opacity: 0.8,
        size: 1,
        legend: {
          title: 'Native status',
          lines: [
            {
              colour: 'blue',
              text: 'Native',
              shape: 'circle',
            },
            {
              colour: 'red',
              text: 'Alien',
              shape: 'circle',
            },
            {
              colour: 'grey',
              text: 'Present',
              shape: 'circle',
            },
            {
              colour: 'blue',
              colour2: 'red',
              text: 'Reintroduced',
              shape: 'bullseye',
            },
            {
              colour: '#F2CC35',
              text: '(data missing)',
              shape: 'circle',
            }
          ]
        }
      })
    }).catch(function(e){
      reject(e)
    })
  })
}
function bsbiHectadDateTetFreq(identifier) {
  const fields = ["to 1929","1930 - 1949","1950 - 1969","1970 - 1986","1987 - 1999","2000 - 2009","2010 - 2019"]

  const colour=d3.scaleLinear().domain([1, 13, 25]).range(['#edf8b1', '#7fcdbb', '#2c7fb8'])
  return new Promise((resolve, reject) => {
    d3.csv(getCSV(identifier), function(r) {
      let fake = fields.reduce((t,f) => t + Number(r[f]), 1) 
      fake = fake ? fake / 7 * 25 : 0
      if (r.hectad) {
        return({
          gr: r.hectad,
          colour: colour(fake),
        })
      }
    }).then(function(data) {
      resolve({
        records: data,
        size: 1,
        shape: 'circle',
        precision: 10000,
        opacity: 0.9,
        legend: {
          title: 'Tetrad frequency',
          lines: [
            {
              colour: '#edf8b1',
              text: '1 tetrad'
            },
            {
              colour: '#7fcdbb',
              text: '13 tetrads'
            },
            {
              colour: '#2c7fb8',
              text: '25 tetrads'
            },
          ]
        }
      })
    }).catch(function(e){
      reject(e)
    })
  })
}