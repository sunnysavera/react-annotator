import { grey, blue, orange, purple } from "@material-ui/core/colors"

export default {
  container: {
    fontSize: 11,
    fontWeight: "bold",
    color: grey[700],
    "& .icon": {
      marginTop: 4,
      width: 10,
      height: 10,
      color:'green',

    },
    "& .icon2": {
      opacity: 0.5,
      width: 10,
      color:'green',
      height: 10,
      transition: "200ms opacity",
      "&:hover": {
        cursor: "pointer",
        opacity: 1,
      },
    },
  },
  row: {
    // padding: 4,
  
    cursor: "pointer",
    "&.header:hover": {
      // backgroundColor: blue[50],
    },
    "&.highlighted": {
      backgroundColor: "#5999c9",
    },
    "&:hover": {
      // backgroundColor: blue[50],
      color: grey[800],
    },
  },
  chip: {
    display: "flex",
    flexDirection: "row",
  


    alignItems: "center",
    "& .color": {
      width: 11,
      height: 11,
      marginRight: 9,
    },
    "& .text": {},
  },
}
