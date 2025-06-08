document.selected_cell = 0;
//var effectTimer1;
//var effectColor1;

// NOTE: pROW.COL, ROW starts at 1, COL(umn) starts at 0
function switch_cell (to_cell, inactiveColor, activeColor, direction, inactivetxtColor, activetxtColor)
{
	if (to_cell == 0)
		return -1; // end-of-range

	var sel_cell;
	var href_to_cell_element = 'l' + to_cell.id.substr(1);
	var href_sel_cell_element;

	// change old cell to inactive style if we already have a selected cell
	if (document.selected_cell != 0)
	{
		//cl('js_nav.js: switch_cell: already have selected cell');

		sel_cell = document.selected_cell;

		href_sel_cell_element = 'l' + sel_cell.id.substr(1);
		sel_cell.style.backgroundColor = inactiveColor;
		document.getElementById(href_sel_cell_element).style.color = inactivetxtColor;

		var href_sel_name = document.getElementById(href_sel_cell_element).name;

		if (href_sel_name) {
			try {
				document.getElementById('table' + href_sel_name).style.visibility = 'hidden';
			} catch(e) {}

			try {
				document.getElementById('buttons' + href_sel_name).style.visibility = 'hidden';
			} catch(e) {}
		}
	}

	// change future cell to active style
	to_cell.style.backgroundColor = activeColor;
	document.getElementById(href_to_cell_element).style.color = activetxtColor;

	//cl('js_nav.js: set to_cell activecolor['+to_cell.style.backgroundColor+'] activeTxtCol['+document.getElementById(href_to_cell_element).style.color+']');

	var href_to_name = document.getElementById(href_to_cell_element).name;

	if (href_to_name)
	{
		try {
			document.getElementById('table' + href_to_name).style.visibility = 'visible';
		} catch(e) {}

		try {
			document.getElementById('buttons' + href_to_name).style.visibility = 'visible';
		} catch(e) {}
	}

	document.selected_cell = to_cell;
}

function follow_link()
{
	var sublink = 'l' + document.selected_cell.id.substr(1);
	if (document.getElementById(sublink).href)
		location.href = document.getElementById(sublink).href;
}

function go_left (inactiveColor, activeColor, inactivetxtColor, activetxtColor)
{
	switch_cell(document.selected_cell.left_cell, inactiveColor, activeColor, 'left', inactivetxtColor, activetxtColor);
}

function go_up (inactiveColor, activeColor, inactivetxtColor, activetxtColor)
{
	switch_cell(document.selected_cell.up_cell, inactiveColor, activeColor, 'up', inactivetxtColor, activetxtColor);
}

function go_right (inactiveColor, activeColor, inactivetxtColor, activetxtColor)
{
	switch_cell(document.selected_cell.right_cell, inactiveColor, activeColor, 'right', inactivetxtColor, activetxtColor);
}

function go_down (inactiveColor, activeColor, inactivetxtColor, activetxtColor)
{
	switch_cell(document.selected_cell.down_cell, inactiveColor, activeColor, 'down', inactivetxtColor, activetxtColor);
}

function find_line_cell (idx, line_cells)
{
	for(; -1 < idx; idx--)
	{
		if(line_cells[idx] != 0)
			return line_cells[idx];
	}
	return 0;
}

function initnav (inactiveColor, activeColor, inactivetxtColor, activetxtColor, initial_id)
{
	var prev_cell;
	var cell;
	var initcell;
	var line_cells;
	var valid_right_cell;
	var valid_column_cells = [0, 0, 0, 0, 0, 0, 0]; // 7 columns max
	var prev_line_cells = [0, 0, 0, 0, 0, 0, 0]; // 7 columns max

	for (var y = 1; y < 18; y++) // 18 rows max
	{
		prev_cell = 0; //reset the prev_cell for RIGHT COLUMN validity
		line_cells = [0, 0, 0, 0, 0, 0, 0]; // 7 columns max
		valid_right_cell = 0;

		for (var x = 0; x < 7; x++)
		{
			cell = 0;
			try
			{
				cell = document.getElementById('p' + y + '.' + x);

				if (cell)
				{
					valid_column_cells[x] = cell; // save valid column/row
					//cl("found row:"+y+",col:"+x);
					cell.left_cell = prev_cell;

					if (prev_cell != 0) { // prev_cell for this COLUMN ONLY is valid
						//cl("left cell will be valid");
						//cl("the previous cell's right cell will be valid");
						// current cell is valid, setting previous cells right_cell to this cell..
						prev_cell.right_cell = cell;
					} else {
						//cl("left_cell will be invalid");
						//cl("right cell setting in left cell will be invalid");
					}
					prev_cell = cell;

					// do an UP CELL check
					cell.up_cell = find_line_cell(x, prev_line_cells);

					// put the current valid cell into the line_cells COLUMN array
					line_cells[x] = cell;
				}
				else
				{
					//cl("invalid row:"+y+",col:"+x);

					if (valid_column_cells[x] != 0)
					{
						//cl("found previously valid cell in column: "+x);
						// at least one cell was valid in this COLUMN
						// just because THIS CELL is invalid, the LEFT CELLs right_cell value should still be OK

						if (prev_cell != 0) // prev_cell for this COLUMN ONLY is valid
						{
							//cl("left cells right cell setting will be valid, set to cell above this one");
							// current cell is valid, setting previous cells right_cell to this cell..
							prev_cell.right_cell = valid_column_cells[x];
							valid_right_cell = 1;
						}
						prev_cell = 0;
					}
				}
			} catch(e) {}

			if (prev_line_cells[x] != 0) // valid
				prev_line_cells[x].down_cell = find_line_cell(x, line_cells);
		}

		if (valid_right_cell == 0)
			prev_cell.right_cell = 0;

		for (idx=0; idx<7; idx++) {
			prev_line_cells[idx] = line_cells[idx];
			line_cells[idx].down_cell = 0;
		}
	}

	if (!initial_id || initial_id == 'undefined')
		initial_id = 'p1.0';

	if (document.getElementById(initial_id))
		switch_cell(document.getElementById(initial_id), inactiveColor, activeColor, 'init', inactivetxtColor, activetxtColor);
}
// NOTE: pROW.COL, ROW starts at 1, COL(umn) starts at 0

